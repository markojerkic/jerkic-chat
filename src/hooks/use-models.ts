import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDefaultModel, getModels } from "~/server/llm/models.functions";

export function useModels() {
  const modelFn = useServerFn(getModels);
  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: modelFn,
    staleTime: Infinity,
  });

  return models ?? [];
}

export function useModel(slug: string) {
  const models = useModels();
  return models.find((model) => model.slug === slug);
}

export function useDefaultModel() {
  const defaultModelFn = useServerFn(getDefaultModel);
  const defaultModel = useQuery({
    queryKey: ["models", "default-model"],
    queryFn: defaultModelFn,
    staleTime: Infinity,
  });

  return defaultModel.data;
}
