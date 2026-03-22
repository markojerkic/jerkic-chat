import type { RefObject } from "react";
import type { SavedMessage } from "~/db/d1/schema";
import { MessagesList } from "./messages-list";
import { ThreadInitialScrollScript } from "./thread-initial-scroll-script";

type ThreadViewportProps = {
  history: SavedMessage[];
  messagesContentRef: RefObject<HTMLDivElement | null>;
  scrollContainerId: string;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
};

export function ThreadViewport({
  history,
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
          <MessagesList history={history} />
        </div>
      </div>

      <ThreadInitialScrollScript scrollContainerId={scrollContainerId} />
    </>
  );
}
