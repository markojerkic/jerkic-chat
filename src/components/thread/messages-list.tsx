import { useParams } from "@tanstack/react-router";
import type { SavedMessage } from "~/db/d1/schema";
import { useThreadMessages } from "~/store/message";
import { EmptyChat } from "../empty-chat";
import { Message } from "../message/message";

type MessagesListProps = {
  history: SavedMessage[];
};

export function MessagesList({ history }: MessagesListProps) {
  // TODO: narrow to a specific route if needed; strict: false returns partial params
  const params = useParams({ strict: false });

  if (!history.length && !params.threadId) {
    return (
      <div className="mx-auto flex h-full w-full max-w-3xl grow flex-col px-4">
        <EmptyChat />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col space-y-3 px-4">
      {history.map((message) => (
        <Message
          key={message.id}
          messageId={message.id}
          message={message}
          isLast={false}
        />
      ))}
    </div>
  );
}

function NewMessages({ threadId }: { threadId: string }) {
  const messageIds = useThreadMessages(threadId);
  return messageIds.map((messageId, i) => (
    <Message
      key={messageId}
      messageId={messageId}
      threadId={threadId}
      isLast={i === messageIds.length - 1}
    />
  ));
}
