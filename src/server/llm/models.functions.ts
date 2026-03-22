import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "../auth/utils";
import { getModels as getModelsImpl } from "./models.server";

export type { Model } from "./models";

export const getModels = createServerFn()
  .middleware([authMiddleware])
  .handler(async () => getModelsImpl());
