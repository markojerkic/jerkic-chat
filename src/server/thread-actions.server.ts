import { env } from "cloudflare:workers";
import * as v from "valibot";
import type { AppContext } from "~/app";
import type { InitialThreadData } from "~/workers/ChatSession";
import type { GetThreadsResult } from "~/workers/UserData";

export const deleteThreadSchema = v.object({
  threadId: v.pipe(v.string(), v.uuid()),
  currentViewingThreadId: v.string(),
});
export type DeleteThreadSchema = v.InferOutput<typeof deleteThreadSchema>;

const deleteRequestSchema = v.pipeAsync(
  v.promise(),
  v.awaitAsync(),
  deleteThreadSchema,
);

export async function getInitialThreadData({
  userId,
  threadId,
}: {
  userId: string;
  threadId: string;
}): Promise<InitialThreadData> {
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${threadId}`),
  );
  // @ts-ignore
  return await threadSession.getInitialThreadData();
}

export async function deleteThread(
  ctx: AppContext,
  request: Request,
  userId: string,
) {
  // TODO: delete
}

export const getUserThreadsSchema = v.object({
  page: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  size: v.optional(v.pipe(v.number(), v.minValue(30)), 30),
});

export type GetUserThreadsInput = v.InferOutput<typeof getUserThreadsSchema>;

export async function getUserThreads(
  userId: string,
  data: GetUserThreadsInput,
): Promise<GetThreadsResult> {
  const userData = env.USER_DATA_DO.get(env.USER_DATA_DO.idFromName(userId));

  return userData.getThreads(data.page, data.size);
}
