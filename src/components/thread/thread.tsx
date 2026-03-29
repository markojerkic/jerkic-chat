import type { SavedMessage } from "~/db/session/schema";
import { useDefaultModel } from "~/hooks/use-models";
import { useThreadScroll } from "~/hooks/use-thread-scroll";
import { ThreadComposer } from "./thread-composer";
import { ThreadViewport } from "./thread-viewport";

type ThreadParams = {
  threadId: string;
  history: SavedMessage[];
  lastModel: string;
};

export function Thread({ threadId, history, lastModel }: ThreadParams) {
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
        thradId={threadId}
        messagesContentRef={messagesContent}
        scrollContainerId={scrollContainerId}
        scrollContainerRef={scrollContainer}
      />

      <ThreadComposer
        threadId={threadId}
        defaultModel={lastModel ?? defaultModel}
        showScrollButton={showScrollButton}
        onScrollToBottom={() => scrollToBottom()}
      />
    </div>
  );
}
