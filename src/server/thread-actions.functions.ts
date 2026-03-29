import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { authMiddleware } from "./auth/utils";
import {
  getLastModel as getLastModelImpl,
  getThreadSession as getThreadSessionImpl,
  getThreadTitle as getThreadTitleImpl,
  getUserThreads as getUserThreadsImpl,
} from "./thread-actions.server";

export const getThreadSession = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(v.pipe(v.string(), v.cuid2()))
  .handler(async ({ data, context }) => {
    return getLastModelImpl({
      userId: context.currentUser.id,
      threadId: data,
    });
  });

export const getLastModel = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(v.pipe(v.string(), v.cuid2()))
  .handler(async ({ data, context }) => {
    return getThreadSessionImpl({
      ctx: context,
      userId: context.currentUser.id,
      threadId: data,
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

export const getThreadTitle = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(v.pipe(v.string(), v.cuid2()))
  .handler(async ({ data, context }) =>
    getThreadTitleImpl(context.currentUser.id, data),
  );
