import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "../auth/utils";
import {
  getDefaultModel as getDefaultModelImpl,
  getModels as getModelsImpl,
} from "./models.server";

export type { Model } from "./models";

export const getModels = createServerFn()
  .middleware([authMiddleware])
  .handler(async () => getModelsImpl());

export const getDefaultModel = createServerFn()
  .middleware([authMiddleware])
  .handler(async () => getDefaultModelImpl());
