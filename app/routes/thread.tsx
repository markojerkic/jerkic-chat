import { redirect, type ShouldRevalidateFunctionArgs } from "react-router";
import { ClientOnly } from "remix-utils/client-only";
import * as v from "valibot";
import Thread from "~/components/thread";
import type { AvailableModel } from "~/models/models";
import { validateSession } from "~/server/auth/lucia";
import { getLlmRespose } from "~/server/llm";
import { deleteThread } from "~/server/thread-actions";
import { useLiveMessages } from "~/store/messages-store";
import type { Route } from "./+types/thread";

export function meta({ data }: Route.MetaArgs) {
  const title = data?.threadTitle ?? "Chat";
  return [
    { title: `${title} | jerkc.chat` },
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

  const method = request.method.toLowerCase();

  if (method === "post") {
    return await getLlmRespose(context, request, thread, userSession.user.id);
  }
  if (method === "delete") {
    await deleteThread(context, request, userSession.user.id);
  }
}

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const userSession = await validateSession(context, request);
  if (!userSession?.user) {
    throw redirect("/auth/login");
  }

  const threadId = params.threadId;

  const [threadTitle, lastModel, messages] = await Promise.all([
    context.db.query.thread
      .findFirst({
        where: (t, { eq }) => eq(t.id, threadId),
        columns: { title: true },
      })
      .then((t) => t?.title),

    context.db.query.message
      .findFirst({
        where: (m, { eq }) => eq(m.thread, threadId),
        columns: { model: true },
        orderBy: (m, { desc }) => desc(m.id),
      })
      .then((m) => m?.model as AvailableModel | undefined),

    context.db.query.message.findMany({
      where: (m, { eq }) => eq(m.thread, threadId),
      orderBy: (m, { asc }) => asc(m.id),
    }),
  ]);

  return {
    messages,
    threadTitle,
    lastModel,
  };
}

const branchingParams = v.object({
  title: v.optional(v.string()),
  lastModel: v.optional(v.string()),
});

export async function clientLoader({
  serverLoader,
  request,
  params,
}: Route.ClientLoaderArgs) {
  const rawSearchParams = Object.fromEntries(
    new URL(request.url).searchParams.entries(),
  );
  const searchParams = v.parse(branchingParams, rawSearchParams);
  console.log("searchParams", searchParams);

  if (searchParams.title && searchParams.lastModel) {
    const messages =
      useLiveMessages.getState().getLiveMessagesForThread(params.threadId) ??
      [];

    // Remove the query params from the history state
    history.replaceState(null, "", location.pathname);

    return {
      messages,
      threadTitle: searchParams.title,
      lastModel: searchParams.lastModel as AvailableModel,
    };
  }

  const data = await serverLoader();
  if (data.messages.length > 0) {
    useLiveMessages.getState().addMessages(data.messages);
  }
  return data;
}

clientLoader.hydrate = true as const;

export default function ThreadPage({
  params,
  loaderData,
}: Route.ComponentProps) {
  return (
    <ClientOnly>
      {() => (
        <Thread
          threadId={params.threadId}
          model={loaderData.lastModel}
          defaultMessages={loaderData.messages}
        />
      )}
    </ClientOnly>
  );
}
