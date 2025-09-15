import useSWR from "swr";
import type { Model } from "~/server/llm/models";

const fetcher = async (url: string): Promise<Model[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }
  return response.json();
};

export const useModels = () => {
  return useSWR("/models", fetcher);
};

export function useModel(model: string) {
  const { data: models = [] } = useModels();
  return models.find((m) => m.slug === model);
}
