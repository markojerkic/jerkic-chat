import { asc } from "drizzle-orm";
import { redirect, type ShouldRevalidateFunctionArgs } from "react-router";
import Thread from "~/components/thread";
import type { AvailableModel } from "~/models/models";
import { validateSession } from "~/server/auth/lucia";
import { getLlmRespose } from "~/server/google";
import { useLiveMessages } from "~/store/messages-store";
import type { Route } from "./+types/thread";

export function meta({ data }: Route.MetaArgs) {
  const title = data?.threadTitle ?? "Chat";
  return [
    { title: `${title} | jerkc chat` },
    { name: "description", content: "Clone of t3.chat" },
  ];
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  if (args.currentParams.threadId === args.nextParams.threadId) {
    return false;
  }

  return args.defaultShouldRevalidate;
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const thread = params.threadId;
  const userSession = await validateSession(context, request);
  if (!userSession?.user) {
    throw redirect("/auth/login");
  }

  return await getLlmRespose(context, request, thread, userSession.user.id);
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
    .then((t) => t?.title);

  const lastModel = await context.db.query.message
    .findFirst({
      where: (m, { eq }) => eq(m.thread, threadId),
      columns: {
        model: true,
      },
      orderBy: (m, { asc }) => asc(m.id),
    })
    .then((m) => m?.model as AvailableModel | undefined);

  const messages = await context.db.query.message.findMany({
    where: (m, { eq }) => eq(m.thread, threadId),
    orderBy: (m) => asc(m.id),
  });
  return { messages, threadTitle, lastModel };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const data = await serverLoader();
  useLiveMessages.getState().addMessages(data.messages);

  return data;
}
clientLoader.hydrate = true as const;

export default function ThreadPage({
  params,
  loaderData,
}: Route.ComponentProps) {
  return <Thread threadId={params.threadId} model={loaderData.lastModel} />;
}
