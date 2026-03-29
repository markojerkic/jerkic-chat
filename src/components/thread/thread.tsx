import type { SavedMessage } from "~/db/session/schema";
import { useDefaultModel } from "~/hooks/use-models";
import { useThreadScroll } from "~/hooks/use-thread-scroll";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";
import { ThreadComposer } from "./thread-composer";
import { ThreadViewport } from "./thread-viewport";

type ThreadParams = {
  threadId: string;
  history: SavedMessage[];
};

export function Thread({ threadId, history }: ThreadParams) {
  const defaultModel = useDefaultModel();
  const {
    messagesContent,
    scrollContainer,
    scrollContainerId,
    scrollToBottom,
    showScrollButton,
  } = useThreadScroll({
    threadId,
    historyLength: history.length,
  });

  return (
    <div className="bg-chat-background relative flex h-full w-full flex-col overflow-hidden">
      <ThreadViewport
        history={history}
        messagesContentRef={messagesContent}
        scrollContainerId={scrollContainerId}
        scrollContainerRef={scrollContainer}
      />

      <ScrollToBottomButton
        showScrollButton={showScrollButton}
        onScrollToBottom={() => scrollToBottom()}
      />

      <ThreadComposer
        threadId={threadId}
        defaultModel={defaultModel ?? "marko"}
      />
    </div>
  );
}
