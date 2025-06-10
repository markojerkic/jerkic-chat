import { uuidv7 } from "uuidv7";
import Thread from "~/components/thread";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "jerkic.chat" },
    { name: "description", content: "Clone of t3.chat" },
  ];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({}: Route.LoaderArgs) {
  const newThreadId = uuidv7();

  return { newThreadId };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Thread threadId={loaderData.newThreadId} />;
}
