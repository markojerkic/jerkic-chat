import {
  createOpenRouter,
  type LanguageModelV2,
} from "@openrouter/ai-sdk-provider";
import { env } from "cloudflare:workers";

export function selectModel(model: string): LanguageModelV2 {
  return createOpenRouter({
    apiKey: env.OPEN_ROUTER_KEY,
  })(model);
}
