import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import type { SavedMessage } from "~/database/schema";
import { useLiveMessage } from "~/store/messages-store";
import { CodeBlock, isMarkdown, useProcessMarkdownContent } from "./code-block";
import { MessageFooter } from "./message-footer";

type MessageProps = {
  messageId: string;
  threadId: string;
  isLast: boolean;
  defaultMessage?: SavedMessage;
};

export function Message({ messageId, isLast, defaultMessage }: MessageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const message = useLiveMessage(messageId) ?? defaultMessage;
  const [isHovered, setIsHovered] = useState(false);
  const text = message?.textContent ?? "";
  const processedParts = useProcessMarkdownContent(text);

  useEffect(() => {
    if (!ref.current || !isLast) {
      return;
    }
    ref.current.scrollIntoView();
  }, [isLast, message.sender]);

  const renderPart = (
    part: { type: "text" | "code"; content: string; lang?: string },
    index: number,
  ) => {
    if (message.sender === "llm" && part.type === "code") {
      return (
        <CodeBlock
          key={index}
          code={part.content}
          lang={part.lang || "text"}
          index={index}
        />
      );
    }

    // Handle text part
    if (message.sender === "llm" && isMarkdown(part.content)) {
      return (
        <div
          key={index}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: marked(part.content) }}
          className="prose prose-sm max-w-none [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs"
        />
      );
    }

    return (
      <pre key={index} className="font-mono whitespace-pre-wrap">
        {part.content}
      </pre>
    );
  };

  return (
    <div
      className="flex data-[is-last=true]:min-h-[calc(100vh-20rem)] data-[sender=user]:justify-end data-[sender=user]:text-left"
      data-is-last={isLast}
      data-sender={message.sender}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative p-3 text-sm leading-relaxed data-[sender=llm]:mr-auto data-[sender=llm]:w-full data-[sender=llm]:self-start data-[sender=llm]:text-gray-900 data-[sender=user]:inline-block data-[sender=user]:max-w-[80%] data-[sender=user]:self-end data-[sender=user]:rounded-xl data-[sender=user]:border data-[sender=user]:border-secondary/50 data-[sender=user]:bg-secondary/50 data-[sender=user]:px-4 data-[sender=user]:py-3 data-[sender=user]:break-words"
        data-sender={message.sender}
        data-id={message.id}
      >
        {processedParts.map(renderPart)}

        {message.status === "streaming" && (
          <div className="my-6 flex items-center justify-start pl-1">
            <div className="dot-animation flex space-x-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
              <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
              <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
            </div>
          </div>
        )}

        <MessageFooter message={message} isHovered={isHovered} text={text} />
        <div ref={ref} />
      </div>
    </div>
  );
}
