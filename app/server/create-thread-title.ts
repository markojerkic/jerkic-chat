import { generateText } from "ai";
import type { AppLoadContext } from "react-router";
import { getDefaultModel } from "./llm/models";
import { selectModel } from "./model-picker";

export async function createThreadTitle(
  ctx: AppLoadContext,
  prompt: string,
): Promise<string> {
  const defaultModel = await getDefaultModel(ctx.cloudflare.env.CHAT_CACHE);
  const llmModel = selectModel(ctx.cloudflare.env, defaultModel);

  return generateText({
    model: llmModel,
    system: `Generating title/summary for a chat thread. 10 to 50 characters long, or 3-5 words long.
        Generate a plain string only, so no markdown, no html, no nothing. Just a plain string.
`,
    prompt: `Make a title for a chat from this question, make it 3-5 words long: "${prompt}"`,
    maxRetries: 3,
  }).then((resp) => resp.text);
}
