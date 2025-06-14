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
    prompt,
    experimental_transform: smoothStream(),
  });

  const processStream = async () => {
    let fullResponse = "";
    let hasError = false;

    // 1. Initialize TWO aggregators with different limits.
    // A small limit for WebSockets for a responsive UI.
    const wsAggregator = new ChunkAggregator({ limit: 512 });
    // A larger limit for the database to reduce write frequency.
    const dbAggregator = new ChunkAggregator({ limit: 2048 });

    const responseTypes: Record<string, number> = {};
    try {
      for await (const chunk of streamPromise.fullStream) {
        responseTypes[chunk.type] = (responseTypes[chunk.type] ?? 0) + 1;
        if (chunk.type === "text-delta") {
          const delta = chunk.textDelta;
          fullResponse += delta;

          // 2. Append the incoming chunk to BOTH aggregators.
          wsAggregator.append(delta);
          dbAggregator.append(delta);

          // 3. Check the WebSocket aggregator and broadcast if its limit is reached.
          if (wsAggregator.hasReachedLimit()) {
            const wsChunk = wsAggregator.getAggregateAndClear();
            stub.broadcast(
              JSON.stringify({
                threadId,
                id: newMessageId,
                type: "text-delta",
                delta: wsChunk,
                model,
              } satisfies WsMessage),
            );
          }

          // 4. Check the Database aggregator and write to DB if its limit is reached.
          if (dbAggregator.hasReachedLimit()) {
            const dbChunk = dbAggregator.getAggregateAndClear();
            await ctx.db.run(
              sql`update message set textContent = coalesce(textContent, '') || ${dbChunk} where id = ${newMessageId}`,
            );
          }
        }
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
      // Flush remaining chunk to the database to ensure all data is saved.
      if (!dbAggregator.isEmpty()) {
        const finalDbChunk = dbAggregator.flush();
        await ctx.db.run(
          sql`update message set textContent = coalesce(textContent, '') || ${finalDbChunk} where id = ${newMessageId}`,
        );
      }

      if (!hasError) {
        await ctx.db
          .update(message)
          .set({ status: "done" })
          .where(eq(message.id, newMessageId));

        // Broadcast completion to client. This message contains the *full* response,
        // ensuring the client has the complete and final text.
        stub.broadcast(
          JSON.stringify({
            threadId,
            id: newMessageId,
            type: "message-finished",
            message: fullResponse,
            model,
          } satisfies WsMessage),
        );
      }
      console.log("llm response types", responseTypes);
    }
  };

  // Start processing the stream
  ctx.cloudflare.ctx.waitUntil(processStream()); // Use waitUntil to process in the background

  return { newMessageId, userMessageId };
}
