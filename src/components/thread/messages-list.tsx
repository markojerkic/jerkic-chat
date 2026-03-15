import { useParams } from "@tanstack/react-router";
import { useThreadMessages } from "~/store/message";
import { EmptyChat } from "../empty-chat";
import { Message } from "../message/message";
import { MessagesListSkeleton } from "./messages-list-skeleton";

type MessagesListProps = {
  threadId: string;
};

export function MessagesList({ threadId }: MessagesListProps) {
  const messageIds = useThreadMessages(threadId);
  // TODO: narrow to a specific route if needed; strict: false returns partial params
  const params = useParams({ strict: false });

  if (messageIds === undefined) {
    return <MessagesListSkeleton />;
  }

  if (!messageIds.length && !params.threadId) {
    return (
      <div className="mx-auto flex h-full w-full max-w-3xl grow flex-col px-4">
        <EmptyChat />
      </div>
    );
  }

  return (
    <div className="w-3xl mx-auto flex grow flex-col space-y-3">
      {messageIds.map((messageId, i) => (
        <Message
          key={messageId}
          messageId={messageId}
          threadId={threadId}
          isLast={i === messageIds.length - 1}
        />
      ))}
    </div>
  );
}
