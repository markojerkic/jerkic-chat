import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { authMiddleware } from "./auth/utils";
import {
  forkThread as forkThreadImpl,
  retryMessage as retryMessageImpl,
  sendMessage as sendMessageImpl,
} from "./llm.server";

export const chatMessageSchema = v.object({
  q: v.pipe(v.string(), v.minLength(1)),
  model: v.string(),
});

export const chatSchema = v.intersect([
  v.object({
    id: v.pipe(v.string(), v.cuid2()),
    threadId: v.pipe(v.string(), v.cuid2()),
    llmMessageId: v.pipe(v.string(), v.cuid2()),
    //   files: v.pipe(
    //     v.string(),
    //     v.parseJson(),
    //     v.array(
    //       v.object({
    //         id: v.pipe(v.string(), v.uuid()),
    //         fileName: v.string(),
    //       }),
    //     ),
    //     v.maxLength(3),
    //   ),
  }),

  chatMessageSchema,
]);
export type ChatMessageInput = v.InferInput<typeof chatSchema>;

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(chatSchema)
  .handler(async ({ data, context }) => {
    return sendMessageImpl(context.currentUser.id, data);
  });

export const retryMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    v.object({
      threadId: v.pipe(v.string(), v.cuid2()),
      messageId: v.pipe(v.string(), v.cuid2()),
      model: v.pipe(
        v.string(),
        v.minLength(5),
        v.regex(/[\w\-_\.]+\/[\w\-_\.]+/, "Should be of format openai/gpt-5.5"),
      ),
    }),
  )
  .handler(async ({ data, context }) => {
    await retryMessageImpl({
      messageId: data.messageId,
      threadId: data.threadId,
      model: data.model,
      userId: context.currentUser.id,
    });
  });

export const forkThread = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    v.object({
      threadId: v.pipe(v.string(), v.cuid2()),
      newThreadId: v.pipe(v.string(), v.cuid2()),
      targetMessageId: v.pipe(v.string(), v.cuid2()),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await forkThreadImpl({
        threadId: data.threadId,
        newThreadId: data.newThreadId,
        targetMessageId: data.targetMessageId,
        userId: context.currentUser.id,
      });
    } catch (e) {
      console.error("failed to fork", e);
      throw e;
    }
  });
