import { valibotSchema } from "@ai-sdk/valibot";
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

export async function retryMessage({
  userId,
  messageId,
  threadId,
  model,
}: {
  userId: string;
  messageId: string;
  threadId: string;
  model: string;
}) {
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${threadId}`),
  );

  return threadSession.retryMessage(messageId, model);
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
    return tavilyPost<TavilySearchResponse>("search", { query });
  },
});

export const webFetchTool = tool({
  description: "Fetch content of a website from one or more urls",
  inputSchema: valibotSchema(webFetchToolSchema),
  execute: async ({ urls }) => {
    const response = await tavilyPost<TavilyExtractApiResponse>("extract", {
      urls,
    });

    return {
      responseTime: response.response_time,
      results: response.results.map((result) => ({
        url: result.url,
        title: result.title,
        rawContent: result.raw_content,
        images: result.images,
        favicon: result.favicon,
      })),
      failedResults: response.failed_results.map((result) => ({
        url: result.url,
        error: result.error,
      })),
      requestId: response.request_id,
      ...(response.usage !== undefined ? { usage: response.usage } : {}),
    };
  },
});

async function tavilyPost<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`https://api.tavily.com/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
      "X-Client-Source": "jerkic-chat",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status} Tavily error: ${JSON.stringify(json)}`);
  }

  return json as T;
}

type TavilySearchResponse = {
  answer?: string;
  query: string;
  response_time?: number;
  responseTime?: number;
  images?: Array<unknown>;
  results: Array<unknown>;
  request_id?: string;
  requestId?: string;
  usage?: { credits: number };
};

type TavilyExtractApiResponse = {
  response_time: number;
  results: Array<{
    url: string;
    title: string | null;
    raw_content: string;
    images?: Array<string>;
    favicon?: string;
  }>;
  failed_results: Array<{
    url: string;
    error: string;
  }>;
  request_id: string;
  usage?: { credits: number };
};

export const websearchChunkSchema = v.looseObject({
  toolName: v.literal("websearch"),
  input: webSearchToolSchema,
});

export const webFetchChunkSchema = v.looseObject({
  toolName: v.literal("webfetch"),
  input: webFetchToolSchema,
});
