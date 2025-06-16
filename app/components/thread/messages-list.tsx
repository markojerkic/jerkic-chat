import { EmptyChat } from "../empty-chat";
import { Message } from "../message/message.client";

type MessagesListProps = {
  threadId: string;
  messageIds: string[];
};

export function MessagesList({ threadId, messageIds }: MessagesListProps) {
  return (
    <div className="mx-auto flex w-3xl grow flex-col space-y-3">
      {!messageIds.length ? (
        <EmptyChat />
      ) : (
        messageIds.map((messageId, i) => (
          <Message
            key={messageId}
            messageId={messageId}
            threadId={threadId}
            isLast={i === messageIds.length - 1}
          />
        ))
      )}
    </div>
  );
}
