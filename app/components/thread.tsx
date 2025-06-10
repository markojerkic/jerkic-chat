import { useRef } from "react";
import { useFetcher } from "react-router";
import { uuidv7 } from "uuidv7";
import { Message } from "~/components/message";
import { useWebSocketMessages } from "~/components/messages-provider";
import { Textarea } from "~/components/ui/textarea";
import {
  useLiveMessages,
  useLiveMessagesForThread,
} from "~/store/messages-store";

export type ThreadParams = {
  threadId: string;
};

export default function Thread({ threadId }: ThreadParams) {
  const fetcher = useFetcher();
  const questionEl = useRef<HTMLTextAreaElement>(null);
  const formEl = useRef<HTMLFormElement>(null);

  useWebSocketMessages();
  const addMessage = useLiveMessages((store) => store.addLiveMessage);

  // Live messages (from store)
  const liveMessages = useLiveMessagesForThread(threadId);

  // Combine all messages for rendering
  const allMessages = liveMessages;

  return (
    <div className="h-full w-full border-t-primary border-l-primary bg-chat-background pt-4 pl-4">
      <div className="mx-auto flex h-full max-w-3xl flex-col justify-end gap-3 p-4">
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
        <div className="sticky right-0 bottom-0 left-0 justify-self-end">
          <fetcher.Form
            ref={formEl}
            className="rounded-t-[20px] border-6 border-chat-border bg-chat-input-background p-0.5 pb-8"
            method="POST"
          >
            <Textarea
              ref={questionEl}
              className="w-full resize-none border-none px-4 py-3 text-gray-900 placeholder-gray-500 shadow-none focus:outline-none focus-visible:ring-0"
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

                const isNewThread =
                  !window.location.pathname.includes("/thread/");

                const userMessageId = uuidv7();
                const newId = uuidv7();
                fetcher.submit(
                  {
                    q: questionEl.current.value,
                    id: newId,
                    userMessageId,
                    newThread: isNewThread,
                  },
                  {
                    method: "post",
                    action: `/thread/${threadId}`,
                  },
                );
                addMessage({
                  id: userMessageId,
                  sender: "user",
                  textContent: questionEl.current.value,
                  thread: threadId,
                });
                addMessage({
                  id: newId,
                  sender: "llm",
                  textContent: null,
                  thread: threadId,
                });
                questionEl.current.value = "";

                console.log(
                  "location",
                  window.location.pathname,
                  window.location.pathname.includes("/thread/"),
                );
                if (isNewThread) {
                  history.pushState(null, "", `/thread/${threadId}`);
                }
              }}
            />
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}
