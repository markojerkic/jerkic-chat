import { valibotSchema } from "@ai-sdk/valibot";
import { tavily } from "@tavily/core";
import { tool } from "ai";
import { env } from "cloudflare:workers";
import * as v from "valibot";
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

const webSearchToolSchema = v.object({
  query: v.pipe(v.string(), v.maxLength(200)),
});
const webFetchToolSchema = v.object({
  urls: v.pipe(
    v.array(v.pipe(v.string(), v.url())),
    v.minLength(1),
    v.maxLength(5),
  ),
});
export const webSearchTool = tool({
  description:
    "Search the web for up-to-date information. After search, use the fetch tool to get more information about specific urls you found here.",
  inputSchema: valibotSchema(webSearchToolSchema),
  execute: async ({ query }) => {
    const tvly = tavily({ apiKey: env.TAVILY_API_KEY });
    const response = await tvly.search(query);
    console.log("web search tool", query);
    return response;
  },
});

export const webFetchTool = tool({
  description: "Fetch content of a website from one or more urls",
  inputSchema: valibotSchema(webFetchToolSchema),
  execute: async ({ urls }) => {
    const tvly = tavily({ apiKey: env.TAVILY_API_KEY });
    const response = await tvly.extract(urls);
    return response;
  },
});

export const websearchChunkSchema = v.looseObject({
  toolName: v.literal("websearch"),
  input: webSearchToolSchema,
});

export const webFetchChunkSchema = v.looseObject({
  toolName: v.literal("webfetch"),
  input: webFetchToolSchema,
});
