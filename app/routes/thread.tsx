import { asc } from "drizzle-orm";
import { redirect } from "react-router";
import Thread from "~/components/thread";
import { validateSession } from "~/server/auth/lucia";
import { getGeminiRespose } from "~/server/google";
import { useLiveMessages } from "~/store/messages-store";
import type { Route } from "./+types/thread";

export function meta({ data }: Route.MetaArgs) {
  const title =
    data !== undefined && "threadTitle" in data ? data.threadTitle : "Chat";
  return [
    { title: `${title} | Jerkc chat` },
    { name: "description", content: "Clone of t3.chat" },
  ];
}

export function shouldRevalidate() {
  return false;
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const thread = params.threadId;
  const userSession = await validateSession(context, request);
  if (!userSession?.user) {
    throw redirect("/auth/login");
  }

  await getGeminiRespose(context, request, thread, userSession.user.id);
}

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const userSession = await validateSession(context, request);
  if (!userSession?.user) {
    throw redirect("/auth/login");
  }

  const threadId = params.threadId;
  const threadTitle = await context.db.query.thread
    .findFirst({
      where: (t, { eq }) => eq(t.id, threadId),
      columns: {
        title: true,
      },
    })
    .then((t) => t!.title);

  const messages = await context.db.query.message.findMany({
    where: (m, { eq }) => eq(m.thread, threadId),
    orderBy: (m) => asc(m.id),
  });
  return { messages, threadTitle };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const { messages } = await serverLoader();
  useLiveMessages.getState().addMessages(messages);

  return messages;
}
clientLoader.hydrate = true;

export default function ThreadPage({ params }: Route.ComponentProps) {
  return <Thread threadId={params.threadId} />;
}
