import { observer } from "mobx-react-lite";
import { useRef } from "react";
import type { ChatMessage } from "~/store/message";
import { AIReasoningBlock } from "./ai-reasoning-block";
import { AttachedFiles } from "./attachment-files";
import { MessageFooter } from "./message-footer";
import { MarkdownMessage } from "./message-markdown";
import { isWebFetchMessagePart, WebFetchBlock } from "./web-fetch-block";
import { isWebSearchMessagePart, WebSearchBlock } from "./web-search-block";

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
  if (message.messagePartIds.length === 0) return undefined;

  return message.messagePartIds?.map((partId) => (
    <LlmMessagePart key={`part-${partId}`} partId={partId} message={message} />
  ));
});

const LlmMessagePart = observer(function LlmMessagePart({
  message,
  partId,
}: {
  message: ChatMessage;
  partId: string;
}) {
  const isStreaming = message.status === "streaming";
  const part = message.messageParts.get(partId);
  if (!part) {
    return null;
  }

  if (part.type === "text") {
    return <MarkdownMessage text={part.content} streaming={isStreaming} />;
  }

  if (part.type === "reasoning") {
    return <AIReasoningBlock content={part.content} streaming={isStreaming} />;
  }

  if (isWebSearchMessagePart(part)) {
    return <WebSearchBlock messagePart={part} />;
  }

  if (isWebFetchMessagePart(part)) {
    return <WebFetchBlock messagePart={part} />;
  }

  if (part.type === "error") {
    return (
      <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2">
        {part.content}
      </div>
    );
  }

  return (
    <pre data-part={part.type}>
      part {part.type}: {JSON.stringify(part, null, 2)}
    </pre>
  );
});
