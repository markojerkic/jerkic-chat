import { useEffect } from "react";
import {
  redirect,
  useNavigate,
  useSearchParams,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
import { ClientOnly } from "remix-utils/client-only";
import * as v from "valibot";
import { useShallow } from "zustand/react/shallow";
import Thread from "~/components/thread/thread";
import { validateSession } from "~/server/auth/lucia";
import { getLlmRespose } from "~/server/llm";
import { getModels } from "~/server/llm/models";
import { deleteThread } from "~/server/thread-actions";
import { useLiveMessages } from "~/store/messages-store";
import type { Route } from "./+types/thread";

export function meta({ data }: Route.MetaArgs) {
  const title = data?.threadTitle ?? "Chat";
  const metadata: Record<string, string>[] = [
    { name: "description", content: "Clone of t3.chat" },
  ];
  if (data?.threadTitle) {
    metadata.push({ title: `${title} | jerkc.chat` });
  }

  return metadata;
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

  const models = await getModels(context.cloudflare.env.CHAT_CACHE);

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
      .then((m) => m?.model as string | undefined),

    context.db.query.message.findMany({
      where: (m, { eq }) => eq(m.thread, threadId),
      orderBy: (m, { asc }) => asc(m.id),
    }),
  ]);

  return {
    messages,
    threadTitle,
    lastModel,
    models,
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

  const messages =
    useLiveMessages.getState().getLiveMessagesForThread(params.threadId) ?? [];

  const serverDataPromise = serverLoader().then((data) => {
    if (data.messages.length > 0) {
      useLiveMessages.getState().addMessages(data.messages);
    }
    useLiveMessages
      .getState()
      .setThreadName(params.threadId, data.threadTitle ?? "Thread");
  });

  if (messages.length === 0) {
    await serverDataPromise;
  }

  if (searchParams.title && searchParams.lastModel) {
    history.replaceState(null, "", location.pathname);
    useLiveMessages
      .getState()
      .setThreadName(params.threadId, searchParams.title);
  }

  const title =
    useLiveMessages.getState().threadNames[params.threadId] ?? "Chat";
  const lastModel = useLiveMessages
    .getState()
    .getLastModelOfThread(params.threadId);
  const newMessages = useLiveMessages
    .getState()
    .getLiveMessagesForThread(params.threadId);

  return {
    messages: newMessages,
    threadTitle: title,
    lastModel,
  };
}

clientLoader.hydrate = true as const;

export default function ThreadPage({ params }: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const threadTitle = useLiveMessages(
    useShallow((state) => state.threadNames[params.threadId]),
  );
  useEffect(() => {
    if (searchParams.has("title") && searchParams.has("lastModel")) {
      navigate(`/thread/${params.threadId}`, { replace: true });
    }
  }, [searchParams, navigate]);

  // Hack, because I don't return threadTitle from loader every time
  useEffect(() => {
    document.title = threadTitle ?? "Chat";
  }, [threadTitle]);

  return (
    <>
      <ClientOnly>{() => <Thread threadId={params.threadId} />}</ClientOnly>
    </>
  );
}
