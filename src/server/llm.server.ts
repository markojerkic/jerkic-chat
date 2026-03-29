import { env } from "cloudflare:workers";
import { type ChatMessageInput } from "./llm.functions";

export async function sendMessage(userId: string, message: ChatMessageInput) {
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${message.threadId}`),
  );
  await threadSession.sendMessage(userId, message);
}
