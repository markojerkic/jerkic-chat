import { asc } from "drizzle-orm";
import { useRef } from "react";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { uuidv7 } from "uuidv7";
import { Message } from "~/components/message";
import { useWebSocketMessages } from "~/components/messages-provider";
import { validateSession } from "~/server/auth/lucia";
import { getGeminiRespose } from "~/server/google";
import {
  useLiveMessages,
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
  const thread = params.threadId;
  return getGeminiRespose(context, request, thread);
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
  const questionEl = useRef<HTMLTextAreaElement>(null);
  const formEl = useRef<HTMLFormElement>(null);

  useWebSocketMessages();
  const addMessage = useLiveMessages((store) => store.addLiveMessage);

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

  // useEffect(() => {
  //   if (!actionData || !fetcher.formData) {
  //     return;
  //   }
  //
  //   console.log("Action data received:", actionData);
  //   const { newMessageId, sentMessageId } = actionData;
  //   const q = fetcher.formData.get("q")! as string;
  //
  //   // Add user message
  //   addNewMessage({
  //     id: sentMessageId,
  //     thread: params.threadId,
  //     sender: "user",
  //     textContent: q,
  //   });
  //
  //   // Add stub for LLM response
  //   addStubMessage(params.threadId, newMessageId);
  // }, [actionData, fetcher.formData, params.threadId]);

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
          ref={formEl}
          className="mx-auto max-w-3xl border-t border-gray-200 bg-white p-4"
          method="POST"
        >
          <textarea
            tabIndex={-1}
            ref={questionEl}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm"
            name="q"
            rows={3}
            placeholder="Type your message..."
            autoComplete="off"
            required
            onKeyDown={(e) => {
              if (!(e.key === "Enter" && !e.shiftKey)) {
                return;
              }
              e.preventDefault();
              if (!questionEl.current) {
                return;
              }
              const userMessageId = uuidv7();
              const newId = uuidv7();
              fetcher.submit(
                {
                  q: questionEl.current.value,
                  id: newId,
                  userMessageId,
                },
                {
                  method: "post",
                },
              );
              addMessage({
                id: userMessageId,
                sender: "user",
                textContent: questionEl.current.value,
                thread: params.threadId,
              });
              console.log("sent one messages");
              addMessage({
                id: newId,
                sender: "llm",
                textContent: null,
                thread: params.threadId,
              });
              console.log("sent another messages");
              questionEl.current.value = "";
            }}
          />
        </fetcher.Form>
      </div>
    </div>
  );
}
