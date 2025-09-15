import { useCallback } from "react";
import { useFetcher, useNavigate } from "react-router";
import { uuidv7 } from "uuidv7";
import * as v from "valibot";
import { useShallow } from "zustand/react/shallow";

import { useDefaultModel } from "~/hooks/use-models";
import { useScrollToBottom } from "~/hooks/use-scroll-to-bottom";
import { isThreadStreaming, useLiveMessages } from "~/store/messages-store";
import { ChatInput } from "./chat-input";
import { MessagesList } from "./messages-list";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";

export type ThreadParams = {
  threadId: string;
};

const chatMessageSchema = v.object({
  q: v.pipe(v.string(), v.minLength(1)),
  model: v.string(),
});

export const chatSchema = v.intersect([
  v.object({
    id: v.pipe(v.string(), v.minLength(1)),
    userMessageId: v.pipe(v.string(), v.minLength(1)),
    newThread: v.pipe(
      v.optional(v.string(), "false"),
      v.transform((s) => s === "true"),
    ),
    files: v.pipe(
      v.string(),
      v.parseJson(),
      v.array(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          fileName: v.string(),
        }),
      ),
      v.maxLength(3),
    ),
  }),
  chatMessageSchema,
]);
type ChatMessageInput = v.InferInput<typeof chatSchema>;

export const chatFormSchema = v.intersect([
  v.object({
    files: v.pipe(
      v.array(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          file: v.file(),
        }),
      ),
      v.maxLength(3),
    ),
  }),
  chatMessageSchema,
]);
export type ChatMessage = v.InferOutput<typeof chatFormSchema>;

export default function Thread({ threadId }: ThreadParams) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const defaultModel = useDefaultModel();

  const addMessage = useLiveMessages(
    useShallow((store) => store.addLiveMessage),
  );
  const model = useLiveMessages(
    useShallow((store) => store.getLastModelOfThread(threadId)),
  );

  const {
    containerRef: messagesContainerRef,
    scrollToBottom,
    showScrollButton,
  } = useScrollToBottom({});

  const handleChatSubmit = useCallback(
    (data: ChatMessage) => {
      const isStreaming = isThreadStreaming(threadId);

      if (isStreaming || fetcher.state !== "idle") return;

      const isNewThread = !window.location.pathname.includes("/thread/");
      const newUserMessage = uuidv7();
      const newLlmId = uuidv7();

      requestAnimationFrame(() => {
        addMessage({
          id: newUserMessage,
          sender: "user",
          textContent: data.q,
          thread: threadId,
          model: data.model,
          status: "done",
          messageAttachemts: data.files.map((file) => ({
            fileName: file.file.name,
            id: file.id,
          })),
        });

        addMessage({
          id: newLlmId,
          sender: "llm",
          textContent: null,
          thread: threadId,
          model: data.model,
          status: "streaming",
          messageAttachemts: [],
        });
      });

      fetcher
        .submit(
          {
            q: data.q,
            model: data.model,
            id: newLlmId,
            userMessageId: newUserMessage,
            newThread: isNewThread,
            files: JSON.stringify(
              data.files.map((file) => ({
                id: file.id,
                fileName: file.file.name,
              })),
            ),
          } satisfies Omit<ChatMessageInput, "newThread"> & {
            newThread: boolean;
          },
          {
            method: "post",
            action: `/thread/${threadId}`,
          },
        )
        .then(() => {
          if (isNewThread) {
            navigate({ pathname: `/thread/${threadId}` });
          }
        });

      history.pushState(null, "", `/thread/${threadId}`);
    },
    [isThreadStreaming, fetcher, threadId, addMessage, navigate],
  );

  return (
    <div
      className="flex h-full w-full flex-col overflow-y-auto bg-chat-background"
      ref={messagesContainerRef}
    >
      <div className="mx-auto flex h-full flex-col px-4 pt-4">
        <MessagesList threadId={threadId} />

        <ScrollToBottomButton
          showScrollButton={showScrollButton}
          onScrollToBottom={scrollToBottom}
        />

        <ChatInput
          threadId={threadId}
          onSubmit={handleChatSubmit}
          isSubmitting={fetcher.state !== "idle"}
          defaultModel={model ?? defaultModel}
        />
      </div>
    </div>
  );
}
