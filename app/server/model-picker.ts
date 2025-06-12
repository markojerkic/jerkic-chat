import { anthropic } from "@ai-sdk/anthropic";
import type { AvailableModel } from "~/models/models";

export function selectModel(model: AvailableModel) {
  anthropic();
}
