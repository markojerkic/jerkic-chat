import { generateText } from "ai";
import { env } from "cloudflare:workers";
import { selectModel } from "./model-picker.server";

export async function createThreadTitle(prompt: string): Promise<string> {
  const llmModel = selectModel(env.THREAD_CREATION_MODEL);

  return generateText({
    model: llmModel,
    system: `Generating title/summary for a chat thread. 10 to 50 characters long, or 3-5 words long.
        Generate a plain string only, so no markdown, no html, no nothing. Just a plain string.
`,
    prompt: `Make a title for a chat from this question, make it 3-5 words long: "${prompt}"`,
    maxRetries: 3,
  }).then((resp) => resp.text);
}
