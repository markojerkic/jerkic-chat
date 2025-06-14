import {
  createOpenRouter,
  type LanguageModelV1,
} from "@openrouter/ai-sdk-provider";
import type { AppLoadContext } from "react-router";
import type { AvailableModel } from "~/models/models";

export function selectModel(
  ctx: AppLoadContext,
  model: AvailableModel,
): LanguageModelV1 {
  return createOpenRouter({
    apiKey: ctx.cloudflare.env.OPEN_ROUTER_API_KEY,
  })(model);
}
