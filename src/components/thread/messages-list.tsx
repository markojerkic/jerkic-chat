import { useParams } from "@tanstack/react-router";
import type { SavedMessage } from "~/database/schema";
import { useMessageIdsForThread } from "~/store/messages-store";
import { EmptyChat } from "../empty-chat";
import { Message } from "../message/message";

type MessagesListProps = {
  threadId: string;
  messages: SavedMessage[];
};

export function MessagesList({ threadId, messages }: MessagesListProps) {
  const messageIds = useMessageIdsForThread(threadId);
  // TODO: narrow to a specific route if needed; strict: false returns partial params
  const params = useParams({ strict: false });

  return (
    <div className="w-3xl mx-auto flex grow flex-col space-y-3">
      {!messageIds.length && !params.threadId ? (
        <EmptyChat />
      ) : (
        messages.map((message, i) => (
          <Message
            key={message.id}
            messageId={message.id}
            threadId={threadId}
            message={message}
            isLast={i === messageIds.length - 1}
          />
        ))
      )}
    </div>
  );
}
