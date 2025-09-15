import { getModels } from "~/server/llm/models";
import type { Route } from "./+types/models";

const CACHE_TTL = 60 * 60 * 24;

export async function loader({ context }: Route.LoaderArgs) {
  const models = await getModels(context.cloudflare.env.CHAT_CACHE);
  return Response.json(models, {
    headers: {
      "Cache-Control": `public, max-age=${CACHE_TTL}`,
    },
  });
}
