import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { authMiddleware } from "./auth/utils";
import {
  getInitialThreadData as getInitialThreadDataImpl,
  getUserThreads as getUserThreadsImpl,
} from "./thread-actions.server";

export const getInitialThreadData = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(v.pipe(v.string(), v.cuid2()))
  .handler(async ({ data, context }) => {
    const result = await getInitialThreadDataImpl({
      userId: context.currentUser.id,
      threadId,
    });

    return {
      lastModel: result.lastModel,
      title: result.title,
      messages: result.messages,
    };
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
