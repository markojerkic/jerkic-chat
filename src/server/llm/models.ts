import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "../auth/utils";

export type { Model } from "./models.server";

export const getModels = createServerFn()
  .middleware([authMiddleware])
  .handler(async () => {
    const { getModelsImpl } = await import("./models.server");
    return getModelsImpl();
  });
