import { marked } from "marked";
import { useEffect, useRef } from "react";
import { useLiveMessage } from "~/store/messages-store";

type MessageProps = {
  messageId: string;
  isSecondToLast: boolean;
};

// Configure once
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Simple markdown detection
const isMarkdown = (text: string) => {
  const markdownPatterns = [
    /#{1,6}\s+/, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /\[.*?\]\(.*?\)/, // Links
    /`.*?`/, // Inline code
    /```[\s\S]*?```/, // Code blocks
    /^\s*[-*+]\s+/m, // Unordered lists
    /^\s*\d+\.\s+/m, // Ordered lists
    /^\s*>\s+/m, // Blockquotes
  ];
  return markdownPatterns.some((pattern) => pattern.test(text));
};

export function Message({ messageId, isSecondToLast }: MessageProps) {
  const ref = useRef<HTMLDivElement>(null);

  // If messageId is provided, get live message from store
  const message = useLiveMessage(messageId);

  const text = message.textContent ?? "";

  const shouldRenderMarkdown = isMarkdown(text);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    if (isSecondToLast) {
      ref.current.scrollIntoView();
    }
  }, [isSecondToLast, message.sender]);

  return (
    <div
      className="flex data-[is-last=true]:min-h-[calc(100vh-20rem)] data-[sender=user]:justify-end data-[sender=user]:text-left"
      data-is-last={isSecondToLast}
      data-sender={message.sender}
      ref={ref}
    >
      <div
        className="p-3 text-sm leading-relaxed data-[sender=llm]:mr-auto data-[sender=llm]:w-full data-[sender=llm]:self-start data-[sender=llm]:text-gray-900 data-[sender=user]:inline-block data-[sender=user]:max-w-[80%] data-[sender=user]:self-end data-[sender=user]:rounded-xl data-[sender=user]:border data-[sender=user]:border-secondary/50 data-[sender=user]:bg-secondary/50 data-[sender=user]:px-4 data-[sender=user]:py-3 data-[sender=user]:break-words"
        data-sender={message.sender}
        data-id={message.id}
      >
        {shouldRenderMarkdown ? (
          <div
            dangerouslySetInnerHTML={{ __html: marked(text) }}
            className="prose prose-sm max-w-none [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs data-[sender=user]:[&_code]:bg-white/20 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-gray-100 [&_pre]:p-2"
          />
        ) : (
          <pre className="font-mono whitespace-pre-wrap">{text}</pre>
        )}
        <div ref={ref} />
      </div>
    </div>
  );
}
