import { useParams } from "@tanstack/react-router";
import { useCallback, type RefObject } from "react";
import { Virtuoso } from "react-virtuoso";
import { useThreadMessages } from "~/store/message";
import { EmptyChat } from "../empty-chat";
import { Message } from "../message/message";

type MessagesListProps = {
  threadId: string;
  scrollContainer?: RefObject<HTMLElement | null>;
};

export function MessagesList({ threadId, scrollContainer }: MessagesListProps) {
  const messageIds = useThreadMessages(threadId);
  // TODO: narrow to a specific route if needed; strict: false returns partial params
  const params = useParams({ strict: false });

  const itemContent = useCallback(
    (index: number, messageId: string) => (
      <div className="mx-auto w-full max-w-3xl px-4 py-1.5">
        <Message
          messageId={messageId}
          threadId={threadId}
          isLast={index === messageIds.length - 1}
        />
      </div>
    ),
    [threadId, messageIds.length],
  );

  if (!messageIds.length && !params.threadId) {
    return (
      <div className="mx-auto flex h-full w-full max-w-3xl grow flex-col px-4">
        <EmptyChat />
      </div>
    );
  }

  return (
    <Virtuoso
      data={messageIds}
      itemContent={itemContent}
      followOutput="smooth"
      customScrollParent={scrollContainer?.current ?? undefined}
      increaseViewportBy={{ top: 400, bottom: 400 }}
      // Render all items during SSR (no DOM = no measured height, Virtuoso renders
      // nothing without this). On the client it remeasures and virtualizes normally.
      initialItemCount={messageIds.length}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
