import { useParams } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import type { SavedMessage } from "~/db/session/schema";
import { ChatContext, ChatStore } from "~/store/chat";
import { EmptyChat } from "../empty-chat";
import { Message } from "../message/message";

type MessagesListProps = {
  history: SavedMessage[];
};

export const MessagesList = observer(function MessagesList({
  history,
}: MessagesListProps) {
  const chatStore = useContext(ChatContext);
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
      {history.map((message, i) => (
        <Message
          key={message.id}
          messageId={message.id}
          message={message}
          isLast={chatStore.hasLiveMessages ? false : i === history.length - 1}
        />
      ))}
      <LiveMessages chatStore={chatStore} />
    </div>
  );
});

const LiveMessages = observer(function LiveMessages({
  chatStore,
}: {
  chatStore: ChatStore;
}) {
  return chatStore.messageIds.map((messageId, i) => (
    <Message
      key={messageId}
      messageId={messageId}
      isLast={i === chatStore.messageIds.length - 1}
    />
  ));
});
