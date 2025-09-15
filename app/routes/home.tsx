import type { ShouldRevalidateFunctionArgs } from "react-router";
import { uuidv7 } from "uuidv7";
import Thread from "~/components/thread/thread";
import { useModels } from "~/hooks/use-models";
import { getModels } from "~/server/llm/models";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "jerkic.chat" },
    { name: "description", content: "Clone of t3.chat" },
  ];
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  if (
    args.currentParams.threadId === undefined ||
    args.currentParams.threadId === null
  ) {
    return false;
  }
  return args.defaultShouldRevalidate;
}

export async function loader({ context }: Route.LoaderArgs) {
  const newThreadId = uuidv7();
  const models = await getModels(context.cloudflare.env.CHAT_CACHE);

  return { newThreadId, models };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const data = await serverLoader();
  useModels.getState().setModels(data.models);
  return data;
}
clientLoader.hydrate = true as const;

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Thread threadId={loaderData.newThreadId} />;
}
