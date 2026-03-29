import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { authMiddleware } from "./auth/utils";
import { sendMessage as sendMessageImpl } from "./llm.server";

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

export const sendMessage = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(chatSchema)
  .handler(async ({ data, context }) => {
    await sendMessageImpl(context.currentUser.id, data);
    console.log("message done");
  });
