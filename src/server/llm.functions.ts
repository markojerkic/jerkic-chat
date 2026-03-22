import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { authMiddleware } from "./auth/utils";

export const retryMessage = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    v.object({
      messageId: v.string(),
      threadId: v.string(),
      model: v.string(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { retryMessage: retryMessageImpl } = await import("./llm.server");
    return retryMessageImpl(
      context,
      data.messageId,
      data.threadId,
      data.model,
      context.currentUser.id,
    );
  });
