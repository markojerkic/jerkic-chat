import { generateText } from "ai";
import type { AppLoadContext } from "react-router";
import type { AvailableModel } from "~/models/models";
import { selectModel } from "./model-picker";

export async function createThreadTitle(
  ctx: AppLoadContext,
  prompt: string,
  model?: AvailableModel,
): Promise<string> {
  const llmModel = selectModel(
    ctx.cloudflare.env,
    model ?? ("google/gemini-2.5-flash-lite" as AvailableModel),
  );

  return generateText({
    model: llmModel,
    system: `Generating title/summary for a chat thread. 10 to 50 characters long, or 3-5 words long.
        Generate a plain string only, so no markdown, no html, no nothing. Just a plain string.
`,
    prompt: `Make a title for a chat from this question, make it 3-5 words long: "${prompt}"`,
    maxRetries: 3,
  }).then((resp) => resp.text);
}
