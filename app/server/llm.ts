import {
  APICallError,
  smoothStream,
  streamText,
  type AssistantContent,
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
import {
  arrayBufferToBase64,
  getDataUrlPrefix,
  getFileFromR2,
  getMimeTypeFromFilename,
  isTextFile,
} from "./files";
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
    const messages = await ctx.db
      .select({
        id: message.id,
        message: message.textContent,
        sender: message.sender,
        attachments: message.messageAttachemts,
      })
      .from(message)
      .where((m) => and(isNotNull(m.message), eq(message.thread, threadId)))
      .orderBy((m) => asc(m.id));

    // Process previous messages with attachments
    for (const m of messages) {
      const content: UserContent = [{ type: "text", text: m.message ?? "" }];

      // Process attachments for this message
      for (const attachment of m.attachments ?? []) {
        try {
          const { buffer, contentType } = await getFileFromR2(
            ctx,
            attachment.id,
          );
          const base64Data = arrayBufferToBase64(buffer);
          const mimeType =
            contentType || getMimeTypeFromFilename(attachment.fileName);

          if (isTextFile(mimeType)) {
            // For text files, decode and include as text
            const textContent = new TextDecoder().decode(buffer);
            content.push({
              type: "text",
              text: `\n\n--- File: ${attachment.fileName} ---\n${textContent}\n--- End of ${attachment.fileName} ---\n`,
            });
          } else {
            // For binary files (images, etc.), include as base64
            content.push({
              type: "file",
              data: getDataUrlPrefix(mimeType) + base64Data,
              mimeType,
              filename: attachment.fileName,
            });
          }
        } catch (error) {
          console.error(`Failed to load attachment ${attachment.id}:`, error);
          content.push({
            type: "text",
            text: `\n[Error: Could not load file ${attachment.fileName}]\n`,
          });
        }
      }

      if (m.sender === "user") {
        prompts.push({
          role: "user",
          content: content,
        });
      } else {
        prompts.push({
          role: "assistant",
          content: content as AssistantContent,
        });
      }
    }
  }

  // Process current message attachments
  const finalPromptContent: UserContent = [];

  for (const attachment of files) {
    try {
      const { buffer, contentType } = await getFileFromR2(ctx, attachment.id);
      const base64Data = arrayBufferToBase64(buffer);
      const mimeType =
        contentType || getMimeTypeFromFilename(attachment.fileName);

      if (isTextFile(mimeType)) {
        // For text files, decode and include as text
        const textContent = new TextDecoder().decode(buffer);
        finalPromptContent.push({
          type: "text",
          text: `\n\n--- File: ${attachment.fileName} ---\n${textContent}\n--- End of ${attachment.fileName} ---\n`,
        });
      } else {
        // For binary files (images, etc.), include as base64
        finalPromptContent.push({
          type: "file",
          data: getDataUrlPrefix(mimeType) + base64Data,
          mimeType,
          filename: attachment.fileName,
        });
      }
    } catch (error) {
      console.error(`Failed to load attachment ${attachment.id}:`, error);
      finalPromptContent.push({
        type: "text",
        text: `\n[Error: Could not load file ${attachment.fileName}]\n`,
      });
    }
  }

  // Add the user's text message
  finalPromptContent.push({ type: "text", text: q });

  prompts.push({
    role: "user",
    content: finalPromptContent,
  });

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
      "You are a helpful chat assistant. Answer in markdown format so that it's easier to render. When analyzing files, be thorough and provide detailed explanations.",
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

    const chunkAggregator = new ChunkAggregator({ limit: 100 });

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
          if (chunk.error instanceof APICallError) {
            const response: { error?: { message?: string } } = JSON.parse(
              chunk.error.responseBody ?? "{}",
            );

            if (response.error?.message) {
              console.error("error", response.error.message);
              const fieldError = `> Error: ${response.error.message}\n`;
              stub.broadcast(
                JSON.stringify({
                  threadId,
                  id: newMessageId,
                  type: "text-delta",
                  delta: fieldError,
                  model,
                } satisfies WsMessage),
              );
              await ctx.db.run(
                sql`update message set textContent = coalesce(textContent, '') || ${fieldError} where id = ${newMessageId}`,
              );
            }
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
