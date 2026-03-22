export type { Model } from "./models.server";

export async function getModels() {
  const { getModelsImpl } = await import("./models.server");
  return getModelsImpl();
}
