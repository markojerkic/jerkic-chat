import { generateObject } from "ai";
import type { AppLoadContext } from "react-router";
import z from "zod";
import type { AvailableModel } from "~/models/models";
import { selectModel } from "./model-picker";

export async function createThreadTitle(
  ctx: AppLoadContext,
  prompt: string,
  model?: AvailableModel,
) {
  const llmModel = selectModel(ctx, model ?? "gemini-2.0-flash");

  const response = await generateObject({
    model: llmModel,
    prompt: `Make a title for a chat from this question, make it 3-5 words long: "${prompt}"`,
    schema: z
      .string()
      .min(10)
      .max(50)
      .catch((ctx_2) =>
        ctx_2.input.substring(0, Math.min(ctx_2.input.length, 50)),
      ),
    maxRetries: 3,
  });
  return response.object;
}
