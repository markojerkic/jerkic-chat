import * as v from "valibot";

const CACHE_TTL = 60 * 60 * 24;

export async function getOrCreateCacheEntry<
  T extends v.BaseSchema<unknown, unknown, any>,
>(
  kv: KVNamespace<string>,
  key: string,
  dataSchema: T,
  loader: () => Promise<v.InferOutput<T>>,
) {
  const entry = await kv.get(key);

  async function fillCache() {
    const data = await loader();
    await kv.put(key, JSON.stringify(data), { expirationTtl: CACHE_TTL });
    return data;
  }

  if (!entry) {
    return fillCache();
  }

  const parseResult = v.safeParse(dataSchema, JSON.parse(entry));
  if (!parseResult.success) {
    return fillCache();
  }

  return parseResult.output;
}

type RawModelsOutput = {
  data: {
    models: {
      name: string;
      short_name: string;
      slug: string;
      author: string;
    }[];
  };
};

const modelsSchema = v.array(
  v.object({
    name: v.string(),
    short_name: v.string(),
    slug: v.string(),
    author: v.string(),
  }),
);
export type Model = v.InferOutput<typeof modelsSchema>[number];

export async function getModels(kv: KVNamespace<string>) {
  return await getOrCreateCacheEntry(kv, "models", modelsSchema, async () => {
    const response = await fetch(
      "https://openrouter.ai/api/frontend/models/find?order=top-weekly",
    );
    const rawModels = await (response.json() as Promise<RawModelsOutput>).then(
      (resp) => {
        return resp.data.models.splice(0, 15);
      },
    );

    const data: Model[] = rawModels.map((model) => ({
      name: model.name,
      short_name: model.short_name,
      slug: model.slug,
      author: model.author,
    }));
    return data;
  });
}

export async function getDefaultModel(kv: KVNamespace<string>) {
  const models = await getModels(kv);
  return models[0].slug;
}
