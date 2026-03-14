import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getModels } from "~/server/llm/models";

export function useModels() {
  const modelFn = useServerFn(getModels);
  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: modelFn,
  });

  return models ?? [];
}

export function useModel(slug: string) {
  const models = useModels();
  return models.find((model) => model.slug === slug);
}

export function useDefaultModel() {
  const models = useModels();

  return models.length > 0 ? models[0].slug : undefined;
}
