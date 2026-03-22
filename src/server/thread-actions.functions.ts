import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { authMiddleware } from "./auth/utils";

export const getThreadSession = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    v.object({
      threadId: v.string(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { getThreadSession: getThreadSessionImpl } =
      await import("./thread-actions.server");

    return getThreadSessionImpl({
      ctx: context,
      userId: context.currentUser.id,
      threadId: data.threadId,
    });
  });

export const getUserThreads = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    v.object({
      page: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
      size: v.optional(v.pipe(v.number(), v.minValue(30)), 30),
    }),
  )
  .handler(async ({ data, context }) => {
    const { getUserThreads: getUserThreadsImpl } =
      await import("./thread-actions.server");
    return getUserThreadsImpl(context, data);
  });
