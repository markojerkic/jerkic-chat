import { smoothStream, streamText } from "ai";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import * as v from "valibot";
import { chatSchema } from "~/components/thread";
import { message } from "~/database/schema";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { createThreadTitle } from "./create-thread-title";
import { ChunkAggregator } from "./llm/chunk-aggregator";
import { selectModel } from "./model-picker";
import { createThreadIfNotExists } from "./thread-actions";

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

    prompt = `${context}Question: ${q}\n\nPlease answer the last question with the context in mind. no need to prefix with Question:\n`;
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
    system:
      "You are a helpful chat assistent. Answer in markdown format so that it's easier to render.",
    prompt,
    experimental_transform: smoothStream(),
  });

  const processStream = async () => {
    let fullResponse = "";
    let hasError = false;

    const chunkAggregator = new ChunkAggregator({ limit: 1024 });

    const responseTypes: Record<string, number> = {};
    try {
      for await (const chunk of streamPromise.fullStream) {
        responseTypes[chunk.type] = (responseTypes[chunk.type] ?? 0) + 1;
        if (chunk.type === "text-delta") {
          const delta = chunk.textDelta;
          fullResponse += delta;

          chunkAggregator.append(delta);

          if (chunkAggregator.hasReachedLimit()) {
            const aggregatedChunk = chunkAggregator.getAggregateAndClear();
            stub.broadcast(
              JSON.stringify({
                threadId,
                id: newMessageId,
                type: "text-delta",
                delta: aggregatedChunk,
                model,
              } satisfies WsMessage),
            );
            await ctx.db.run(
              sql`update message set textContent = coalesce(textContent, '') || ${aggregatedChunk} where id = ${newMessageId}`,
            );
          }
        }
      }

      const lastChunk = chunkAggregator.getAggregateAndClear();
      if (lastChunk.length > 0) {
        stub
          .broadcast(
            JSON.stringify({
              threadId,
              id: newMessageId,
              type: "last-chunk",
              delta: lastChunk,
              model,
            } satisfies WsMessage),
          )
          .then(() => console.log("done finished"))
          .catch((e) => console.error("failed sending broadcast", e));
        await ctx.db.run(
          sql`update message set textContent = coalesce(textContent, '') || ${lastChunk} where id = ${newMessageId}`,
        );
      } else {
        stub.broadcast(
          JSON.stringify({
            threadId,
            id: newMessageId,
            type: "last-chunk",
            delta: "",
            model,
          } satisfies WsMessage),
        );
      }
    } catch (err) {
      hasError = true;
      console.error("Error while streaming LLM response:", err);
      await ctx.db
        .update(message)
        .set({ status: "error", textContent: "An error occurred." })
        .where(eq(message.id, newMessageId));

      stub.broadcast(
        JSON.stringify({
          threadId,
          id: newMessageId,
          type: "error",
        } satisfies WsMessage),
      );
    } finally {
      if (!hasError) {
        await ctx.db
          .update(message)
          .set({ status: "done" })
          .where(eq(message.id, newMessageId));
      }

      console.log("llm response types", responseTypes);
    }
  };

  // Start processing the stream
  ctx.cloudflare.ctx.waitUntil(processStream());

  return { newMessageId, userMessageId };
}
