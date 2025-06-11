import { useEffect, useRef } from "react";
import { useFetcher, useNavigate } from "react-router";
import { uuidv7 } from "uuidv7";
import { Message } from "~/components/message";
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
  const navigate = useNavigate();

  const addMessage = useLiveMessages((store) => store.addLiveMessage);

  const messageIds = useLiveMessagesForThread(threadId);

  useEffect(() => {
    if (questionEl.current) {
      questionEl.current.focus();
    }
  }, [threadId, questionEl.current]);

  return (
    <div className="flex h-full w-full flex-col bg-chat-background">
      {/* Messages area - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-4">
          {messageIds.length === 0 ? (
            // Empty state - centers content when no messages
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>Start a conversation</p>
              </div>
            </div>
          ) : (
            // Messages list
            <div className="space-y-3">
              {messageIds.map((messageId, i) => (
                <Message
                  key={messageId}
                  messageId={messageId}
                  isSecondToLast={i === messageIds.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input area - sticky at bottom */}
      <div className="flex-shrink-0 bg-chat-background backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <fetcher.Form
            ref={formEl}
            className="bg-chat-overaly rounded-t-[20px] border-8 border-chat-border/60 p-1"
            style={{
              outline: `8px solid oklch(var(--chat-input-gradient) / 0.5)`,
              boxShadow: `rgba(0, 0, 0, 0.1) 0px 80px 50px 0px,
                         rgba(0, 0, 0, 0.07) 0px 50px 30px 0px,
                         rgba(0, 0, 0, 0.06) 0px 30px 15px 0px,
                         rgba(0, 0, 0, 0.04) 0px 15px 8px,
                         rgba(0, 0, 0, 0.04) 0px 6px 4px,
                         rgba(0, 0, 0, 0.02) 0px 2px 2px`,
            }}
            method="POST"
          >
            <Textarea
              ref={questionEl}
              className="w-full resize-none border-none px-4 py-3 text-gray-900 shadow-none placeholder:text-secondary-foreground/70 focus:outline-none focus-visible:ring-0"
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
                fetcher
                  .submit(
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
                  )
                  .then(() => {
                    navigate({
                      pathname: `/thread/${threadId}`,
                    });
                  });
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
                if (isNewThread) {
                  history.pushState(null, "", `/thread/${threadId}`);
                }
              }}
            />

            <div className="h-10 w-full" />
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}
