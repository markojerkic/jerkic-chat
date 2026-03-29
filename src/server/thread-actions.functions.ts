import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { authMiddleware } from "./auth/utils";
import {
  getThreadSession as getThreadSessionImpl,
  getUserThreads as getUserThreadsImpl,
} from "./thread-actions.server";

export const getThreadSession = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    v.object({
      threadId: v.string(),
    }),
  )
  .handler(async ({ data, context }) => {
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
  .handler(async ({ data, context }) =>
    getUserThreadsImpl(context.currentUser.id, data),
  );
