import { smoothStream, streamText } from "ai";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import * as v from "valibot";
import { chatSchema } from "~/components/thread";
import { message } from "~/database/schema";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { createThreadIfNotExists } from "./create-thread";
import { createThreadTitle } from "./create-thread-title";
import { selectModel } from "./model-picker";

const requestSchema = v.pipeAsync(v.promise(), v.awaitAsync(), chatSchema);

export async function getLlmRespose(
  ctx: AppLoadContext,
  request: Request,
  threadId: string,
  userId: string,
  shouldFetchContext = true,
) {
  const {
    q,
    id: newMessageId,
    userMessageId,
    newThread,
    model,
  } = await v.parseAsync(
    requestSchema,
    request.formData().then((fd) => Object.fromEntries(fd.entries())),
  );

  const llmModel = selectModel(ctx, model);

  if (newThread) {
    const title = await createThreadTitle(ctx, q);

    await createThreadIfNotExists(ctx, threadId, userId, title);
  }

  ctx.cloudflare.ctx.waitUntil(
    ctx.db.insert(message).values({
      id: userMessageId,
      sender: "user",
      thread: threadId,
      textContent: q,
      model,
      status: "done",
    }),
  );

  let prompt = q;

  if (shouldFetchContext) {
    const context = await ctx.db
      .select({
        id: message.id,
        message: message.textContent,
        sender: message.sender,
      })
      .from(message)
      .where((m) => and(isNotNull(m.message), eq(message.thread, threadId)))
      .orderBy((m) => asc(m.id))
      .then((messages) =>
        messages.map(
          (m) =>
            `${m.sender === "user" ? "Question" : "Answer"}: ${m.message}\n`,
        ),
      );

    prompt = `${context}Question: ${q}


Please answer the last question with the context in mind. no need to prefix with Question:
`;
  }

  await ctx.db
    .insert(message)
    .values({
      id: newMessageId,
      sender: "llm",
      thread: threadId,
      model,
      status: "streaming",
    })
    .returning({ id: message.id });
  const id = ctx.cloudflare.env.WEBSOCKET_SERVER.idFromName(userId);
  const stub = ctx.cloudflare.env.WEBSOCKET_SERVER.get(id);

  const streamPromise = streamText({
    model: llmModel,
    prompt,
    experimental_transform: smoothStream(),
    onError(err) {
      console.error("failed generating", err);
      ctx.cloudflare.ctx.waitUntil(
        ctx.db
          .update(message)
          .set({ status: "error" })
          .where(eq(message.id, newMessageId)),
      );
    },
    onFinish(finishResult) {
      const llmResponse = finishResult.text;

      ctx.cloudflare.ctx.waitUntil(
        stub.broadcast(
          JSON.stringify({
            threadId,
            id: newMessageId,
            type: "message-finished",
            message: llmResponse,
            model,
          } satisfies WsMessage),
        ),
      );
      ctx.cloudflare.ctx.waitUntil(
        ctx.db
          .update(message)
          .set({ textContent: llmResponse, status: "done" })
          .where(eq(message.id, newMessageId)),
      );
    },
  });

  const chunksPromise = new Promise<void>(async (res) => {
    for await (const chunk of streamPromise.fullStream) {
      if (chunk.type === "text-delta") {
        // await new Promise((res) => setTimeout(res, 100));

        ctx.cloudflare.ctx.waitUntil(
          stub.broadcast(
            JSON.stringify({
              threadId,
              id: newMessageId,
              type: "text-delta",
              delta: chunk.textDelta,
              model,
            } satisfies WsMessage),
          ),
        );
        ctx.cloudflare.ctx.waitUntil(
          ctx.db.run(
            sql`update message set textContent = coalesce(textContent, '') || ${chunk.textDelta} where id = ${newMessageId}`,
          ),
        );
      } else if (chunk.type === "finish") {
        res();
      }
    }
  });

  ctx.cloudflare.ctx.waitUntil(chunksPromise);

  return { newMessageId, userMessageId };
}
