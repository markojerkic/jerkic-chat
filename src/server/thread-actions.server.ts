import { env } from "cloudflare:workers";
import * as v from "valibot";
import type { InitialThreadData } from "~/workers/ChatSession";
import type { GetThreadsResult } from "~/workers/UserData";

export const deleteThreadSchema = v.object({
  threadId: v.pipe(v.string(), v.cuid2()),
});
export type DeleteThreadSchema = v.InferOutput<typeof deleteThreadSchema>;

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

export async function deleteThread(threadId: string, userId: string) {
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${threadId}`),
  );
  const userData = env.USER_DATA_DO.get(env.USER_DATA_DO.idFromName(userId));
  await Promise.all([
    threadSession.deleteMessages(),
    userData.deleteThread(threadId),
  ]);
}

export async function getGeneratedImage({
  userId,
  threadId,
  messageId,
  key,
}: {
  userId: string;
  threadId: string;
  messageId: string;
  key: string;
}) {
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${threadId}`),
  );

  return threadSession.getGeneratedImage(messageId, key);
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
