import { useRouteLoaderData } from "react-router";
import type { Model } from "~/server/llm/models";

export function useModels() {
  const { models } = useRouteLoaderData("routes/layout") as { models: Model[] };
  console.log("models", models);

  return models;
}

export function useModel(slug: string) {
  const models = useModels();
  return models.find((model) => model.slug === slug);
}

export function useDefaultModel() {
  const models = useModels();

  return models.length > 0 ? models[0].slug : undefined;
}
