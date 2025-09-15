import { create } from "zustand";
import type { Model } from "~/server/llm/models";

export const useModels = create<{
  models: Model[];
  setModels: (models: Model[]) => void;
  getModel: (slug: string) => Model | undefined;
}>((set, get) => ({
  models: [],
  setModels: (models: Model[]) => set({ models }),
  getModel: (slug: string) => get().models.find((m) => m.slug === slug),
}));

export const useModel = (slug: string) =>
  useModels((state) => state.getModel)(slug);

export function useDefaultModel() {
  const models = useModels((state) => state.models);

  return models.length > 0 ? models[0].slug : undefined;
}
