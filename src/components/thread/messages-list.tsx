import { useParams } from "@tanstack/react-router";
import { useThreadMessages } from "~/store/message";
import { EmptyChat } from "../empty-chat";
import { Message } from "../message/message";

type MessagesListProps = {
  threadId: string;
};

export function MessagesList({ threadId }: MessagesListProps) {
  const messageIds = useThreadMessages(threadId);
  // TODO: narrow to a specific route if needed; strict: false returns partial params
  const params = useParams({ strict: false });

  return (
    <div className="w-3xl mx-auto flex grow flex-col space-y-3">
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
