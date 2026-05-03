import { observer } from "mobx-react-lite";
import { useRef } from "react";
import type { SavedMessageWithParts } from "~/db/session/schema";
import type { ChatMessage } from "~/store/message";
import { AttachedFiles } from "./attachment-files";
import { MessageFooter } from "./message-footer";
import { MarkdownMessage } from "./message-markdown";

type MessageProps = {
  message: ChatMessage;
};

export const Message = observer(function Message({ message }: MessageProps) {
  const ref = useRef<HTMLDivElement>(null);

  const status = message?.status;
  const sender = message?.sender;

  return (
    <div
      className="group flex data-[is-last=true]:min-h-[calc(100vh-20rem)] data-[sender=user]:justify-end data-[sender=user]:text-left"
      data-is-last={message.isLastMessage}
      data-sender={sender}
    >
      <div
        className="data-[sender=user]:border-secondary/50 data-[sender=user]:bg-secondary/50 data-[sender=user]:wrap-break-word relative p-3 text-sm leading-relaxed data-[sender=llm]:mr-auto data-[sender=user]:inline-block data-[sender=llm]:w-full data-[sender=user]:max-w-[80%] data-[sender=llm]:self-start data-[sender=user]:self-start data-[sender=user]:rounded-xl data-[sender=user]:border data-[sender=user]:px-4 data-[sender=user]:py-3 data-[sender=llm]:text-gray-900"
        data-sender={sender}
        data-id={message.id}
      >
        <MessageContent message={message} />

        {status === "streaming" && (
          <div className="my-6 flex items-center justify-start pl-1">
            <div className="dot-animation flex space-x-1">
              <span className="bg-muted-foreground h-2 w-2 rounded-full"></span>
              <span className="bg-muted-foreground h-2 w-2 rounded-full"></span>
              <span className="bg-muted-foreground h-2 w-2 rounded-full"></span>
            </div>
          </div>
        )}

        <MessageFooter message={message} />
        {message?.messageAttachemts &&
          message.messageAttachemts?.length > 0 && (
            <div className="-mb-6 flex flex-col gap-2">
              <AttachedFiles
                files={message.messageAttachemts}
                messageId={message.id}
              />
            </div>
          )}
        <div ref={ref} />
      </div>
    </div>
  );
});

const MessageContent = observer(function MessageContent({
  message,
}: {
  message: ChatMessage;
}) {
  const sender = message.sender;
  const text = message.textContent;

  if (sender === "llm") {
    return <MessageParts message={message} />;
  }

  return <pre className="whitespace-pre-wrap font-mono">{text}</pre>;
});

const MessageParts = observer(function MessageParts({
  message,
}: {
  message: ChatMessage;
}) {
  return message.parts?.map((part) => (
    <LlmMessagePart
      key={part.id}
      part={part}
      isStreaming={message.status === "streaming"}
    />
  ));
});

const LlmMessagePart = observer(function LlmMessagePart({
  part,
  isStreaming,
}: {
  part: SavedMessageWithParts["parts"][number];
  isStreaming: boolean;
}) {
  if (!part.textContent) {
    return null;
  }

  if (part.type === "text" && part.textContent.type === "text") {
    return (
      <MarkdownMessage
        text={part.textContent.content}
        streaming={isStreaming}
      />
    );
  }

  return (
    <pre>
      part {part.type}: {JSON.stringify(part.textContent, null, 2)}
    </pre>
  );
});
