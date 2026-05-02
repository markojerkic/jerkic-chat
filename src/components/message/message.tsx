import { observer } from "mobx-react-lite";
import { useContext, useRef } from "react";
import type { SavedMessage } from "~/db/session/schema";
import { ChatContext } from "~/store/chat";
import { AttachedFiles } from "./attachment-files";
import { MessageFooter } from "./message-footer";
import { MarkdownMessage } from "./message-markdown";

type MessageProps = {
  messageId: string;
  isLast: boolean;
  message?: SavedMessage;
};

export const Message = observer(function Message({
  message: historyMessage,
  messageId,
  isLast,
}: MessageProps) {
  const chatStore = useContext(ChatContext);
  const ref = useRef<HTMLDivElement>(null);
  const message = historyMessage ?? chatStore.getMessage(messageId)?.message;

  const status = message?.status;
  const sender = message?.sender;

  return (
    <div
      className="group flex data-[is-last=true]:min-h-[calc(100vh-20rem)] data-[sender=user]:justify-end data-[sender=user]:text-left"
      data-is-last={isLast}
      data-sender={sender}
    >
      <div
        className="data-[sender=user]:border-secondary/50 data-[sender=user]:bg-secondary/50 data-[sender=user]:wrap-break-word relative p-3 text-sm leading-relaxed data-[sender=llm]:mr-auto data-[sender=user]:inline-block data-[sender=llm]:w-full data-[sender=user]:max-w-[80%] data-[sender=llm]:self-start data-[sender=user]:self-start data-[sender=user]:rounded-xl data-[sender=user]:border data-[sender=user]:px-4 data-[sender=user]:py-3 data-[sender=llm]:text-gray-900"
        data-sender={sender}
        data-id={messageId}
      >
        <MessageContent message={historyMessage} />

        {status === "streaming" && (
          <div className="my-6 flex items-center justify-start pl-1">
            <div className="dot-animation flex space-x-1">
              <span className="bg-muted-foreground h-2 w-2 rounded-full"></span>
              <span className="bg-muted-foreground h-2 w-2 rounded-full"></span>
              <span className="bg-muted-foreground h-2 w-2 rounded-full"></span>
            </div>
          </div>
        )}

        <MessageFooter messageId={messageId} historyMessage={historyMessage} />
        {message?.messageAttachemts &&
          message.messageAttachemts?.length > 0 && (
            <div className="-mb-6 flex flex-col gap-2">
              <AttachedFiles
                files={message.messageAttachemts}
                messageId={messageId}
              />
            </div>
          )}
        <div ref={ref} />
      </div>
    </div>
  );
});

function MessageContent({ message }: { message: SavedMessage }) {
  const sender = message.sender;
  const text = message.textContent;

  if (sender === "llm" && text) {
    return (
      <MarkdownMessage text={text} streaming={message.status === "streaming"} />
    );
  }

  return <pre className="whitespace-pre-wrap font-mono">{text}</pre>;
}
