import { type AssistantContent, type ModelMessage, type UserContent } from "ai";
import { env, waitUntil } from "cloudflare:workers";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import * as v from "valibot";
import type { AppContext } from "~/app";
import { chatSchema } from "~/components/thread/thread";
import { message } from "~/db/d1/schema";
import { createThreadTitle } from "./create-thread-title.server";
import {
  arrayBufferToBase64,
  getDataUrlPrefix,
  getFileFromR2,
  getMimeTypeFromFilename,
  isTextFile,
} from "./files.server";
import type { ChatMessageInput } from "./llm.functions";
import { createThreadIfNotExists } from "./thread-actions.server";

export async function sendMessage(userId: string, message: ChatMessageInput) {
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${message.threadId}`),
  );
  await threadSession.sendMessage(message);
}

// TODO: check if we need to delete the rest
const requestSchema = v.pipeAsync(v.promise(), v.awaitAsync(), chatSchema);

export async function getLlmRespose(
  ctx: AppContext,
  request: Request,
  threadId: string,
  userId: string,
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
    const title = await createThreadTitle(q);
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

  console.log("llm prepare time", Date.now() - start);

  await processMessagesAndStream(ctx, threadId, newMessageId, model, userId);

  return { newMessageId, userMessageId };
}

async function processMessagesAndStream(
  ctx: AppContext,
  threadId: string,
  newMessageId: string,
  model: string,
  userId: string,
) {
  const prompts: ModelMessage[] = [];

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

  await ctx.db
    .insert(message)
    .values({
      id: newMessageId,
      sender: "llm",
      thread: threadId,
      model,
      status: "streaming",
    })
    .onConflictDoUpdate({
      target: message.id,
      set: {
        sender: "llm",
        model,
        status: "streaming",
        textContent: null,
        messageAttachemts: [],
      },
    });

  const id = env.WEBSOCKET_SERVER.idFromName(userId);
  const stub = env.WEBSOCKET_SERVER.get(id);

  waitUntil(stub.processStream(threadId, newMessageId, model, prompts));
}

async function processAttachment(
  ctx: AppContext,
  attachment: { id: string; fileName: string },
): Promise<UserContent[number]> {
  try {
    const { buffer, contentType } = await getFileFromR2(attachment.id);
    const mimeType =
      contentType || getMimeTypeFromFilename(attachment.fileName);

    if (isTextFile(mimeType)) {
      const textContent = new TextDecoder().decode(buffer);
      return {
        type: "text",
        text: `\n\n--- File: ${attachment.fileName} ---\n${textContent}\n--- End of ${attachment.fileName} ---\n`,
      };
    }

    const base64Data = arrayBufferToBase64(buffer);
    return {
      type: "file",
      data: getDataUrlPrefix(mimeType) + base64Data,
      mediaType: mimeType,
      filename: attachment.fileName,
    };
  } catch (error) {
    console.error(`Failed to load attachment ${attachment.id}:`, error);
    return {
      type: "text",
      text: `\n[Error: Could not load file ${attachment.fileName}]\n`,
    };
  }
}
