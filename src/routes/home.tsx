import type { ShouldRevalidateFunctionArgs } from "react-router";
import { uuidv7 } from "uuidv7";
import Thread from "~/components/thread/thread";
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

export async function loader() {
  const newThreadId = uuidv7();

  return { newThreadId };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Thread threadId={loaderData.newThreadId} />;
}
