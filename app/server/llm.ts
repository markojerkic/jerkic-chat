import {
  APICallError,
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
    files: currentFiles,
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
      messageAttachemts: currentFiles,
    }),
  );

  const prompts: CoreMessage[] = [];

  if (shouldFetchContext) {
    const previousMessages = await ctx.db
      .select({
        message: message.textContent,
        sender: message.sender,
        attachments: message.messageAttachemts,
      })
      .from(message)
      .where(and(isNotNull(message.textContent), eq(message.thread, threadId)))
      .orderBy(asc(message.id));

    for (const m of previousMessages) {
      const content: UserContent = [{ type: "text", text: m.message ?? "" }];

      if (m.attachments && m.attachments.length > 0) {
        const attachmentPromises = m.attachments.map((att) =>
          processAttachment(ctx, att),
        );
        const resolvedAttachments = await Promise.all(attachmentPromises);
        // @ts-expect-error - This is a hack to get around the fact that the type of content is not inferred correctly
        content.push(...resolvedAttachments);
      }

      if (m.sender === "user") {
        prompts.push({ role: "user", content });
      } else {
        prompts.push({
          role: "assistant",
          content: content as AssistantContent,
        });
      }
    }
  }

  const finalPromptContent: UserContent = [];
  if (currentFiles && currentFiles.length > 0) {
    const attachmentPromises = currentFiles.map((file) =>
      processAttachment(ctx, file),
    );
    const resolvedAttachments = await Promise.all(attachmentPromises);
    // @ts-expect-error - This is a hack to get around the fact that the type of content is not inferred correctly
    finalPromptContent.push(...resolvedAttachments);
  }

  finalPromptContent.push({ type: "text", text: q });

  prompts.push({
    role: "user",
    content: finalPromptContent,
  });

  await ctx.db.insert(message).values({
    id: newMessageId,
    sender: "llm",
    thread: threadId,
    model,
    status: "streaming",
  });

  const id = ctx.cloudflare.env.WEBSOCKET_SERVER.idFromName(userId);
  const stub = ctx.cloudflare.env.WEBSOCKET_SERVER.get(id);

  console.log("llm prepare time", Date.now() - start);

  const streamPromise = streamText({
    model: llmModel,
    system:
      "You are a helpful chat assistant. Answer in markdown format so that it's easier to render. When analyzing files, be thorough and provide detailed explanations.",
    messages: prompts,
  });

  const processStream = async () => {
    let hasError = false;
    const chunkAggregator = new ChunkAggregator({ limit: 400 });
    const responseTypes: Record<string, number> = {};

    try {
      for await (const chunk of streamPromise.fullStream) {
        responseTypes[chunk.type] = (responseTypes[chunk.type] ?? 0) + 1;

        if (chunk.type === "text-delta") {
          chunkAggregator.append(chunk.textDelta);

          if (chunkAggregator.hasReachedLimit()) {
            const aggregatedChunk = chunkAggregator.getAggregateAndClear();
            await Promise.all([
              stub.broadcast(
                JSON.stringify({
                  threadId,
                  id: newMessageId,
                  type: "text-delta",
                  delta: aggregatedChunk,
                  model,
                } satisfies WsMessage),
              ),
              ctx.db.run(
                sql`update message set textContent = coalesce(textContent, '') || ${aggregatedChunk} where id = ${newMessageId}`,
              ),
            ]);
          }
        } else if (chunk.type === "error") {
          console.error("error chunk:", chunk.error);
          if (chunk.error instanceof APICallError && chunk.error.responseBody) {
            const response: { error?: { message?: string } } = JSON.parse(
              chunk.error.responseBody,
            );
            if (response.error?.message) {
              const fieldError = `> Error: ${response.error.message}\n`;
              await Promise.all([
                stub.broadcast(
                  JSON.stringify({
                    threadId,
                    id: newMessageId,
                    type: "text-delta",
                    delta: fieldError,
                    model,
                  } satisfies WsMessage),
                ),
                ctx.db.run(
                  sql`update message set textContent = coalesce(textContent, '') || ${fieldError} where id = ${newMessageId}`,
                ),
              ]);
            }
          }
        }
      }

      const lastChunk = chunkAggregator.getAggregateAndClear();
      await Promise.all([
        stub.broadcast(
          JSON.stringify({
            threadId,
            id: newMessageId,
            type: "last-chunk",
            delta: lastChunk,
            model,
          } satisfies WsMessage),
        ),
        lastChunk.length > 0
          ? ctx.db.run(
              sql`update message set textContent = coalesce(textContent, '') || ${lastChunk} where id = ${newMessageId}`,
            )
          : Promise.resolve(),
      ]);
      console.log("done finished");
    } catch (err) {
      hasError = true;
      console.error("Error while streaming LLM response:", err);
      await Promise.all([
        ctx.db
          .update(message)
          .set({ status: "error", textContent: "An error occurred." })
          .where(eq(message.id, newMessageId)),
        stub.broadcast(
          JSON.stringify({
            threadId,
            id: newMessageId,
            type: "error",
          } satisfies WsMessage),
        ),
      ]);
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

  ctx.cloudflare.ctx.waitUntil(processStream());

  return { newMessageId, userMessageId };
}

async function processAttachment(
  ctx: AppLoadContext,
  attachment: { id: string; fileName: string },
): Promise<UserContent[number]> {
  try {
    const { buffer, contentType } = await getFileFromR2(ctx, attachment.id);
    const mimeType =
      contentType || getMimeTypeFromFilename(attachment.fileName);

    if (isTextFile(mimeType)) {
      const textContent = new TextDecoder().decode(buffer);
      return {
        type: "text",
        text: `\n\n--- File: ${attachment.fileName} ---\n${textContent}\n--- End of ${attachment.fileName} ---\n`,
      };
    } else {
      const base64Data = arrayBufferToBase64(buffer);
      return {
        type: "file",
        data: getDataUrlPrefix(mimeType) + base64Data,
        mimeType,
        filename: attachment.fileName,
      };
    }
  } catch (error) {
    console.error(`Failed to load attachment ${attachment.id}:`, error);
    return {
      type: "text",
      text: `\n[Error: Could not load file ${attachment.fileName}]\n`,
    };
  }
}
