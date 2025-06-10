import { asc } from "drizzle-orm";
import { useEffect } from "react";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { Message } from "~/components/message";
import { useWebSocketMessages } from "~/components/messages-provider";
import { validateSession } from "~/server/auth/lucia";
import { getGeminiRespose } from "~/server/google";
import {
  addNewMessage,
  addStubMessage,
  useLiveMessagesForThread,
} from "~/store/messages-store";
import type { Route } from "./+types/thread";

export function shouldRevalidate() {
  return false;
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const userSession = await validateSession(context, request);
  if (!userSession?.user) {
    throw redirect("/auth/login");
  }
  const formData = await request.formData();
  const thread = params.threadId;
  return getGeminiRespose(context, thread, formData);
}

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const userSession = await validateSession(context, request);
  if (!userSession?.user) {
    throw redirect("/auth/login");
  }

  const threadId = params.threadId;
  const messages = await context.db.query.message.findMany({
    where: (m, { eq }) => eq(m.thread, threadId),
    orderBy: (m) => asc(m.id),
  });
  return messages;
}

export default function Thread({ params, actionData }: Route.ComponentProps) {
  const fetcher = useFetcher<Route.ActionArgs>();
  useWebSocketMessages();

  // Database messages (from loader)
  const dbMessages = useLoaderData<typeof loader>();

  // Live messages (from store)
  const liveMessages = useLiveMessagesForThread(params.threadId);

  // Combine all messages for rendering
  const allMessages = [...dbMessages, ...liveMessages];

  console.log("Rendering thread:", {
    threadId: params.threadId,
    dbMessages: dbMessages.length,
    liveMessages: liveMessages.length,
    total: allMessages.length,
  });

  useEffect(() => {
    if (!actionData || !fetcher.formData) {
      return;
    }

    console.log("Action data received:", actionData);
    const { newMessageId, sentMessageId } = actionData;
    const q = fetcher.formData.get("q")! as string;

    // Add user message
    addNewMessage({
      id: sentMessageId,
      thread: params.threadId,
      sender: "user",
      textContent: q,
    });

    // Add stub for LLM response
    addStubMessage(params.threadId, newMessageId);
  }, [actionData, fetcher.formData, params.threadId]);

  return (
    <div className="flex h-full w-full grow flex-col justify-end gap-3 bg-gray-50 p-4">
      {allMessages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      {allMessages.length > 0 && (
        <div
          id="bottom"
          ref={(e) => {
            if (!e) return;
            e.scrollIntoView();
          }}
        />
      )}
      <div className="sticky right-0 bottom-0 left-0">
        <fetcher.Form
          className="mx-auto max-w-3xl border-t border-gray-200 bg-white p-4"
          method="POST"
        >
          <textarea
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
            name="q"
            rows={3}
            placeholder="Type your message..."
            autoComplete="off"
          />
        </fetcher.Form>
      </div>
    </div>
  );
}
