import { env } from "cloudflare:workers";
import { type ChatMessageInput } from "./llm.functions";

export async function sendMessage(userId: string, message: ChatMessageInput) {
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${message.threadId}`),
  );
  await threadSession.sendMessage(userId, message);
}

export async function getWsConnection(
  request: Request,
  userId: string,
  threadId: string,
) {
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${threadId}`),
  );

  return await threadSession.fetch(request);
}
