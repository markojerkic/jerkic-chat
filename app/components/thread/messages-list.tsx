import { useParams } from "react-router";
import { useMessageIdsForThread } from "~/store/messages-store";
import { EmptyChat } from "../empty-chat";
import { Message } from "../message/message.client";

type MessagesListProps = {
  threadId: string;
};

export function MessagesList({ threadId }: MessagesListProps) {
  const messageIds = useMessageIdsForThread(threadId);
  const params = useParams();

  return (
    <div className="mx-auto flex w-3xl grow flex-col space-y-3">
      {!messageIds.length && !params.threadId ? (
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
