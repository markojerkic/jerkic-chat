import { useFetcher } from "react-router";
import type { Route } from "./+types/thread";
import { getGeminiRespose } from "~/server/google";
import { Suspense, useEffect, useRef } from "react";
import { Message } from "~/components/message";
import { asc } from "drizzle-orm";
import { MessagesProvider } from "~/components/messages-provider";
import {
  addRequestAndStubMessage,
  setMessagesOfThread,
  useMessageIdsOfThread,
  useMessages,
} from "~/store/messages-store";

export function shouldRevalidate() {
  return false;
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const thread = params.threadId;

  return getGeminiRespose(context, thread, formData);
}

export async function clientAction({
  request,
  params,
  serverAction,
}: Route.ClientActionArgs) {
  const q = await request.formData().then((fd) => fd.get("q")! as string);
  const { newMessageId, sentMessageId } = await serverAction();
  addRequestAndStubMessage({
    newMessageId,
    sentMessageId,
    threadId: params.threadId,
    q,
  });
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const threadId = params.threadId;

  const messages = await context.db.query.message.findMany({
    where: (m, { eq }) => eq(m.thread, threadId),
    orderBy: (m) => asc(m.id),
  });

  return messages;
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const messages = await serverLoader();
  setMessagesOfThread(messages);
}
clientLoader.hydrate = true as const;

export default function Thread({ params }: Route.ComponentProps) {
  const fetcher = useFetcher<Route.ActionArgs>();
  const messages = useMessageIdsOfThread(params.threadId);

  useEffect(() => {
    console.log("received messages", messages);
  }, [messages]);

  return (
    <div className="relative w-full h-screen bg-gray-50">
      <div className="flex flex-col h-full w-full border-l border-t border-gray-200 pb-[80px] transition-all ease-in-out max-sm:border-none sm:rounded-tl-xl">
        <MessagesProvider />
        <div className="w-full grow flex flex-col justify-end bg-gray-50 gap-3 p-4">
          {messages.map((messageId) => (
            <Message key={messageId} messageId={messageId} />
          ))}
          {messages.length > 0 && (
            <div
              id="bottom"
              ref={(e) => {
                if (!e) return;
                e.scrollIntoView();
              }}
            />
          )}
        </div>
        <fetcher.Form
          className="sticky bottom-0 left-0 right-0 border-t border-gray-200 bg-white  p-4"
          method="POST"
        >
          <div className="w-full px-4">
            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900 shadow-sm"
              name="q"
              placeholder="Type your message..."
              autoComplete="off"
            />
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
