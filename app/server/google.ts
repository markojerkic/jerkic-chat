import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, smoothStream, streamText } from "ai";
import { asc, eq, isNotNull, sql } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import * as v from "valibot";
import { z } from "zod";
import { message } from "~/database/schema";
import { createThreadIfNotExists } from "./create-thread";

const chatSchema = v.object({
  q: v.pipe(v.string(), v.minLength(1)),
  id: v.pipe(v.string(), v.minLength(1)),
  userMessageId: v.pipe(v.string(), v.minLength(1)),
  newThread: v.pipe(
    v.optional(v.string(), "false"),
    v.transform((s) => s === "true"),
  ), //v.optional(v.pipe(v.string(), v.transform(s => s === "true")), false)
});
const requestSchema = v.pipeAsync(v.promise(), v.awaitAsync(), chatSchema);

export async function getGeminiRespose(
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
  } = await v.parseAsync(
    requestSchema,
    request.formData().then((fd) => Object.fromEntries(fd.entries())),
  );

  const apiKey = ctx.cloudflare.env.GEMINI_API_KEY;
  const google = createGoogleGenerativeAI({
    apiKey,
  });

  if (newThread) {
    const title = await generateObject({
      model: google("gemini-2.0-flash-lite"),
      prompt: `Make a title for a chat from this question, make it 3-5 words long: "${q}"`,
      schema: z.string().max(30),
    }).then((response) => response.object);

    await createThreadIfNotExists(ctx, threadId, userId, title);
  }

  ctx.cloudflare.ctx.waitUntil(
    ctx.db.insert(message).values({
      id: userMessageId,
      sender: "user",
      thread: threadId,
      textContent: q,
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
      .where((m) => isNotNull(m.message))
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
    })
    .returning({ id: message.id });
  const id = ctx.cloudflare.env.WEBSOCKET_SERVER.idFromName("default");
  const stub = ctx.cloudflare.env.WEBSOCKET_SERVER.get(id);

  const streamPromise = streamText({
    model: google("gemini-2.0-flash-lite"),
    prompt,
    experimental_transform: smoothStream(),
    onError(err) {
      console.error("failed generating", err);
    },
    onChunk(chunk) {
      console.log("chunk", chunk);
    },
    onFinish(finishResult) {
      console.log("finished", finishResult);
      const llmResponse = finishResult.text;
      ctx.cloudflare.ctx.waitUntil(
        ctx.db
          .update(message)
          .set({ textContent: llmResponse })
          .where(eq(message.id, newMessageId)),
      );
    },
  });

  const chunksPromise = new Promise<void>(async (res) => {
    for await (const chunk of streamPromise.fullStream) {
      console.log("chunk", chunk);
      if (chunk.type === "text-delta") {
        // await new Promise((res) => setTimeout(res, 100));
        stub.broadcast(
          JSON.stringify({
            threadId,
            id: newMessageId,
            type: "text-delta",
            delta: chunk.textDelta,
          }),
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
