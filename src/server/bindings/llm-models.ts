import { createServerFn } from "@tanstack/react-start";
import { requireCurrentUser } from "~/server/.server/auth/utils";
import { getModels as getModelsImpl } from "~/server/.server/llm/models";

export type { Model } from "~/server/.server/llm/models.server";

export const getModels = createServerFn().handler(async ({ context }) => {
  await requireCurrentUser(context);
  return getModelsImpl();
});
