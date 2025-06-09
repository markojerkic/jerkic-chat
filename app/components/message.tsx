import { marked } from "marked";
import { useRef } from "react";
import { useLiveMessage, type Message } from "~/store/messages-store";

type MessageProps = {
  message?: Message;
  messageId?: string; // For backwards compatibility
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

export function Message({ message, messageId }: MessageProps) {
  const ref = useRef<HTMLDivElement>(null);

  // If messageId is provided, get live message from store
  const liveMessage = messageId ? useLiveMessage(messageId) : undefined;

  // Use provided message or live message
  const finalMessage = message || liveMessage;

  if (!finalMessage || !finalMessage.textContent) return null;

  const shouldRenderMarkdown = isMarkdown(finalMessage.textContent);

  return (
    <div
      className="max-w-md rounded-lg border p-3 text-sm leading-relaxed shadow-sm data-[sender=llm]:mr-auto data-[sender=llm]:self-start data-[sender=llm]:border-gray-200 data-[sender=llm]:bg-gray-100 data-[sender=llm]:text-gray-900 data-[sender=user]:ml-auto data-[sender=user]:self-end data-[sender=user]:border-blue-700 data-[sender=user]:bg-blue-600 data-[sender=user]:text-white"
      data-sender={finalMessage.sender}
      data-id={finalMessage.id}
    >
      {shouldRenderMarkdown ? (
        <div
          dangerouslySetInnerHTML={{ __html: marked(finalMessage.textContent) }}
          className="prose prose-sm max-w-none [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs data-[sender=user]:[&_code]:bg-white/20 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-gray-100 [&_pre]:p-2"
        />
      ) : (
        <pre className="font-mono whitespace-pre-wrap">
          {finalMessage.textContent}
        </pre>
      )}
      <div ref={ref} />
    </div>
  );
}
