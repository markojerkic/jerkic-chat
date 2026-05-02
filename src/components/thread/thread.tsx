import { observer } from "mobx-react-lite";
import { useDefaultModel } from "~/hooks/use-models";
import { useThreadScroll } from "~/hooks/use-thread-scroll";
import type { ChatStore } from "~/store/chat";
import { ThreadComposer } from "./thread-composer";
import { ThreadViewport } from "./thread-viewport";

type ThreadParams = {
  threadId: string;
  chatStore: ChatStore;
  lastModel: string | undefined;
};

export const Thread = observer(function Thread({
  threadId,
  chatStore,
  lastModel,
}: ThreadParams) {
  const defaultModel = useDefaultModel();
  const {
    messagesContent,
    scrollContainer,
    scrollContainerId,
    scrollToBottom,
    showScrollButton,
  } = useThreadScroll({
    threadId,
    chatStore,
  });

  return (
    <div className="bg-chat-background relative flex h-full w-full flex-col overflow-hidden">
      <ThreadViewport
        chatStore={chatStore}
        threadId={threadId}
        messagesContentRef={messagesContent}
        scrollContainerId={scrollContainerId}
        scrollContainerRef={scrollContainer}
      />

      <ThreadComposer
        chatStore={chatStore}
        threadId={threadId}
        defaultModel={lastModel ?? defaultModel}
        showScrollButton={showScrollButton}
        onScrollToBottom={() => scrollToBottom()}
      />
    </div>
  );
});
