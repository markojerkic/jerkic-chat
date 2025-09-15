import * as v from "valibot";
import type { Route } from "./+types/models";

async function getOrCreateCacheEntry<
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
    await kv.put(key, JSON.stringify(data), { expirationTtl: 60 * 60 });
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
type Model = v.InferOutput<typeof modelsSchema>[number];

export async function loader({ context }: Route.LoaderArgs) {
  const models = await getOrCreateCacheEntry(
    context.cloudflare.env.CHAT_CACHE,
    "models",
    modelsSchema,
    async () => {
      const response = await fetch("https://api.openai.com/v1/models");
      const data: Model[] = await response
        .json()
        .then((response: RawModelsOutput) =>
          response.data.models.map((model) => ({
            name: model.name,
            short_name: model.short_name,
            slug: model.slug,
            author: model.author,
          })),
        );
      return data;
    },
  );
}
