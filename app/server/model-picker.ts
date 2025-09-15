import {
  createOpenRouter,
  type LanguageModelV1,
} from "@openrouter/ai-sdk-provider";
import type { AppLoadContext } from "react-router";

export function selectModel(
  ctx: AppLoadContext["cloudflare"]["env"],
  model: string,
): LanguageModelV1 {
  return createOpenRouter({
    apiKey: ctx.OPEN_ROUTER_API_KEY,
  })(model);
}
