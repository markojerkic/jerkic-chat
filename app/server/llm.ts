import { type AssistantContent, type CoreMessage, type UserContent } from "ai";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import * as v from "valibot";
import { chatSchema } from "~/components/thread";
import { message } from "~/database/schema";
import { createThreadTitle } from "./create-thread-title";
import {
  arrayBufferToBase64,
  getDataUrlPrefix,
  getFileFromR2,
  getMimeTypeFromFilename,
  isTextFile,
} from "./files";
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

  if (newThread) {
    const title = await createThreadTitle(ctx, q);
    await createThreadIfNotExists(ctx, threadId, userId, title);
  }

  await ctx.db.insert(message).values({
    id: userMessageId,
    sender: "user",
    thread: threadId,
    textContent: q,
    model,
    status: "done",
    messageAttachemts: currentFiles,
  });

  const prompts: CoreMessage[] = [];

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

  ctx.cloudflare.ctx.waitUntil(
    stub.processStream(threadId, newMessageId, model, prompts),
  );

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
