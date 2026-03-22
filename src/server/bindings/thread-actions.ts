import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { requireCurrentUser } from "~/server/.server/auth/utils";
import { getUserThreads as getUserThreadsImpl } from "~/server/.server/thread-actions";

export const getUserThreads = createServerFn()
  .inputValidator(
    v.object({
      page: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
      size: v.optional(v.pipe(v.number(), v.minValue(30)), 30),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireCurrentUser(context);
    return getUserThreadsImpl(context, data.page, data.size);
  });
