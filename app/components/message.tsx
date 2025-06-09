import { marked } from "marked";
import { useEffect, useRef } from "react";
import { useMessage, type Message } from "~/store/messages-store";

type MessageProps = {
  messageId: string;
  initialMessageState?: Message | undefined;
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

export function Message({ messageId, initialMessageState }: MessageProps) {
  const message = useMessage(messageId) ?? initialMessageState;
  const ref = useRef<HTMLDivElement>(null);

  if (!message || !message.textContent) return null;

  const shouldRenderMarkdown = isMarkdown(message.textContent);

  return (
    <div
      className="
        p-3 max-w-md rounded-lg shadow-sm
        data-[sender=user]:bg-blue-600 data-[sender=user]:text-white data-[sender=user]:self-end data-[sender=user]:ml-auto
        data-[sender=llm]:bg-gray-100 data-[sender=llm]:text-gray-900 data-[sender=llm]:self-start data-[sender=llm]:mr-auto
        text-sm leading-relaxed
        border data-[sender=user]:border-blue-700 data-[sender=llm]:border-gray-200
      "
      data-sender={message.sender}
      data-id={message.id}
    >
      {shouldRenderMarkdown ? (
        <div
          dangerouslySetInnerHTML={{ __html: marked(message.textContent) }}
          className="prose prose-sm max-w-none
            [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
            [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto
            data-[sender=user]:[&_code]:bg-white/20"
        />
      ) : (
        <pre className="whitespace-pre-wrap font-mono">
          {message.textContent}
        </pre>
      )}
      <div ref={ref} />
    </div>
  );
}
