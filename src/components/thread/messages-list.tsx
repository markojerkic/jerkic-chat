import { useParams } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { ChatStore } from "~/store/chat";
import { EmptyChat } from "../empty-chat";
import { Message } from "../message/message";

type MessagesListProps = {
  chat: ChatStore;
};

export const MessagesList = observer(function MessagesList({
  chat,
}: MessagesListProps) {
  const params = useParams({ strict: false });

  if (!chat.messageIds.length && !params.threadId) {
    return (
      <div className="mx-auto flex h-full w-full max-w-3xl grow flex-col px-4">
        <EmptyChat />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col space-y-3 px-4">
      {chat.messageIds.map((messageId) => (
        <MessageById key={messageId} chatStore={chat} messageId={messageId} />
      ))}
    </div>
  );
});

const MessageById = observer(function MessageById({
  chatStore,
  messageId,
}: {
  chatStore: ChatStore;
  messageId: string;
}) {
  const message = chatStore.getMessage(messageId);

  if (!message) {
    return null;
  }

  return <Message message={message} />;
});
