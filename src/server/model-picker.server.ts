import {
  createOpenRouter,
  type LanguageModelV2,
} from "@openrouter/ai-sdk-provider";
import { env } from "cloudflare:workers";

type RuntimeEnv = {
  OPEN_ROUTER_KEY: string;
};

export function selectModel(model: string): LanguageModelV2;
export function selectModel(
  runtimeEnv: RuntimeEnv,
  model: string,
): LanguageModelV2;
export function selectModel(
  first: string | RuntimeEnv,
  second?: string,
): LanguageModelV2 {
  const model = typeof first === "string" ? first : (second ?? "");
  const apiKey =
    typeof first === "string" ? env.OPEN_ROUTER_KEY : first.OPEN_ROUTER_KEY;

  return createOpenRouter({
    apiKey,
  })(model);
}
