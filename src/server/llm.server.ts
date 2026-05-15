import { valibotSchema } from "@ai-sdk/valibot";
import { createId } from "@paralleldrive/cuid2";
import { generateImage, tool, type Provider } from "ai";
import { env } from "cloudflare:workers";
import * as v from "valibot";
import { type ChatMessageInput } from "./llm.functions";

export async function sendMessage(userId: string, message: ChatMessageInput) {
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${message.threadId}`),
  );
  return await threadSession.sendMessage(userId, message);
}

export async function forkThread({
  userId,
  threadId,
  newThreadId,
}: {
  userId: string;
  targetMessageId: string;
  threadId: string;
  newThreadId: string;
}) {
  const user = env.USER_DATA_DO.get(env.USER_DATA_DO.idFromName(userId));
  const threadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${threadId}`),
  );
  const newThreadSession = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${newThreadId}`),
  );
  await user.forkThread(threadId, newThreadId);
  const dumpedDb = await threadSession.dumpDatabase();
  await newThreadSession.restoreDatabase(dumpedDb);
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

const generateImageToolSchema = v.object({
  prompt: v.pipe(v.string(), v.minLength(1), v.maxLength(2000)),
  model: v.pipe(
    v.union([
      v.pipe(
        v.literal("google/gemini-3-pro-image-preview"),
        v.description(
          "More premium model. The model generates context-rich graphics, from infographics and diagrams to cinematic composites, and can incorporate real-time information via Search grounding.",
        ),
      ),
      v.pipe(
        v.literal("google/gemini-3.1-flash-image-preview"),
        v.description(
          "Faster, cheaper model. Gemini 3.1 Flash Image Preview, a.k.a. 'Nano Banana 2,' is Google’s latest state of the art image generation and editing model, delivering Pro-level visual quality at Flash speed.",
        ),
      ),
    ]),
    v.description(
      "Choose a model with which to generate based on the level of detail, expense and speed the user needs",
    ),
  ),
  imageSize: v.pipe(
    v.string(),
    v.regex(/\d+:\d+/),
    v.description(
      "Size of the image you want to generate. In format <number>x<number>",
    ),
  ),
});

export function generateImageTool(
  provider: Pick<Provider, "imageModel">,
  saveImage: R2Bucket["put"],
) {
  return tool({
    description:
      "Generate an image based on an input prompt. After generating, don't reference the model output in the response to the user. Don't say 'Here's the image: blob'. You get the base64 encoded data if you need to introspect. But the UI will render the image on it's own. No need for you to do anything more about that.",
    inputSchema: valibotSchema(generateImageToolSchema),
    execute: async ({ prompt, model, imageSize }) => {
      try {
        const { image } = await generateImage({
          prompt,
          model: provider.imageModel(model),
          aspectRatio: imageSize as `${number}:${number}`,
        });
        const imageId = createId();
        const imageKey = `tools/image/${imageId}`;
        await saveImage(imageKey, image.uint8Array, {
          httpMetadata: {
            contentType: "image/png",
          },
        });
        return { fileKey: imageKey };
      } catch (e) {
        console.error("image gen error", e);
        throw e;
      }
    },
  });
}

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

export const generateImageChunkSchema = v.looseObject({
  toolName: v.literal("generateImage"),
  output: v.looseObject({
    fileKey: v.string(),
  }),
});
