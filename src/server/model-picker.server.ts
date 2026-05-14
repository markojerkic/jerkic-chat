import {
  createOpenRouter,
  type LanguageModelV3,
} from "@openrouter/ai-sdk-provider";
import { env } from "cloudflare:workers";

type RuntimeEnv = {
  OPEN_ROUTER_KEY: string;
};

export function getProvider() {
  return createOpenRouter({
    apiKey: env.OPEN_ROUTER_KEY,
  });
}

export function selectModel(model: string): LanguageModelV3;
export function selectModel(
  runtimeEnv: RuntimeEnv,
  model: string,
): LanguageModelV3;
export function selectModel(
  first: string | RuntimeEnv,
  second?: string,
): LanguageModelV3 {
  const model = typeof first === "string" ? first : (second ?? "");
  const apiKey =
    typeof first === "string" ? env.OPEN_ROUTER_KEY : first.OPEN_ROUTER_KEY;

  const openrouter = createOpenRouter({
    apiKey,
  });

  return openrouter(model);
}
