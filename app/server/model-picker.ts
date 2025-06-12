import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { AppLoadContext } from "react-router";
import type { AvailableModel } from "~/models/models";

export function selectModel(ctx: AppLoadContext, model: AvailableModel) {
  switch (model) {
    case "claude-4-sonnet-20250514":
    case "claude-3-7-sonnet-20250219":
    case "claude-3-5-sonnet-latest":
    case "claude-3-5-haiku-latest":
      return createAnthropic({
        apiKey: ctx.cloudflare.env.CLAUDE_API_KEY,
      })(model);

    case "gemini-1.5-flash":
    case "gemini-1.5-pro":
    case "gemini-2.0-flash":
    case "gemini-2.5-flash-preview-05-20":
      return createGoogleGenerativeAI({
        apiKey: ctx.cloudflare.env.GEMINI_API_KEY,
      })(model);

    default:
      throw Error(`Model ${model} not supported`);
  }
}
