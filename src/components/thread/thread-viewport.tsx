import type { RefObject } from "react";
import type { ChatStore } from "~/store/chat";
import { MessagesList } from "./messages-list";
import { ThreadInitialScrollScript } from "./thread-initial-scroll-script";

type ThreadViewportProps = {
  threadId: string;
  chatStore: ChatStore;
  messagesContentRef: RefObject<HTMLDivElement | null>;
  scrollContainerId: string;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
};

export function ThreadViewport({
  chatStore,
  messagesContentRef,
  scrollContainerId,
  scrollContainerRef,
}: ThreadViewportProps) {
  return (
    <>
      <div
        className="relative min-h-0 grow overflow-y-auto pt-4"
        id={scrollContainerId}
        ref={scrollContainerRef}
      >
        <div className="pb-40 md:pb-44" ref={messagesContentRef}>
          <MessagesList chat={chatStore} />
        </div>
      </div>

      <ThreadInitialScrollScript scrollContainerId={scrollContainerId} />
    </>
  );
}
