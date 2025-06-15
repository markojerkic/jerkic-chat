import {
  smoothStream,
  streamText,
  type CoreMessage,
  type UserContent,
} from "ai";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import * as v from "valibot";
import { chatSchema } from "~/components/thread";
import { message } from "~/database/schema";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { createThreadTitle } from "./create-thread-title";
import { generatePresignedUrl, getMimeTypeFromFilename } from "./files";
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
  const start = Date.now();

  const {
    q,
    id: newMessageId,
    userMessageId,
    newThread,
    model,
    files,
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
      messageAttachemts: files,
    }),
  );

  let prompts: CoreMessage[] = [];

  if (shouldFetchContext) {
    await ctx.db
      .select({
        id: message.id,
        message: message.textContent,
        sender: message.sender,
        attachments: message.messageAttachemts,
      })
      .from(message)
      .where((m) => and(isNotNull(m.message), eq(message.thread, threadId)))
      .orderBy((m) => asc(m.id))
      .then((messages) =>
        messages.forEach(async (m) => {
          const content: UserContent = [
            { type: "text", text: m.message ?? "" },
          ];

          for await (const attachment of m.attachments ?? []) {
            const presigneedUrl = await generatePresignedUrl(
              ctx,
              attachment.id,
            );
            const mimeType = getMimeTypeFromFilename(attachment.fileName);
            content.push({
              type: "file",
              data: presigneedUrl,
              mimeType,
            });
          }

          prompts.push({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.message ?? "",
          });
        }),
      );
  }

  const finalPromptContent: UserContent = [{ type: "text", text: q }];

  for await (const attachment of files) {
    const presigneedUrl = await generatePresignedUrl(ctx, attachment.id);
    const mimeType = getMimeTypeFromFilename(attachment.fileName);
    finalPromptContent.push({
      type: "file",
      data: presigneedUrl,
      mimeType,
    });
  }

  prompts.push({
    role: "user",
    content: finalPromptContent,
  });

  console.log("-----------");
  console.log("prompts", prompts);
  console.log("-----------");

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

  console.log("llm prepare time", Date.now() - start);

  const streamPromise = streamText({
    model: llmModel,
    system:
      "You are a helpful chat assistent. Answer in markdown format so that it's easier to render.",
    messages: prompts,
    providerOptions: {
      google: { responseModalities: ["TEXT", "IMAGE"] },
      gemini: { responseModalities: ["TEXT", "IMAGE"] },
    },
    experimental_transform: smoothStream(),
  });

  const processStream = async () => {
    let fullResponse = "";
    let hasError = false;

    const chunkAggregator = new ChunkAggregator({ limit: 512 });

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
        } else if (chunk.type === "file") {
          console.log("file", chunk);
        } else if (chunk.type === "error") {
          console.error("error", chunk);
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
