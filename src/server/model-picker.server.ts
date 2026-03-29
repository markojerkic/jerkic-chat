import { devToolsMiddleware } from "@ai-sdk/devtools";
import {
  createOpenRouter,
  type LanguageModelV3,
} from "@openrouter/ai-sdk-provider";
import { wrapLanguageModel } from "ai";
import { env } from "cloudflare:workers";

type RuntimeEnv = {
  OPEN_ROUTER_KEY: string;
};

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

  return wrapLanguageModel({
    model: openrouter(model),
    middleware: devToolsMiddleware(),
  });
}
