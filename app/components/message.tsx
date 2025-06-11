import { marked } from "marked";
import { useEffect, useRef } from "react";
import SyntaxHighlighter from "react-shiki";
import { useLiveMessage } from "~/store/messages-store";

type MessageProps = {
  messageId: string;
  isSecondToLast: boolean;
};

// Extract code blocks and their positions
const extractCodeBlocks = (text: string) => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{
    lang: string;
    code: string;
    start: number;
    end: number;
  }> = [];
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      lang: match[1] || "text",
      code: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return blocks;
};

// Split text into parts (text + code blocks)
const parseContent = (text: string) => {
  const codeBlocks = extractCodeBlocks(text);
  const parts: Array<{
    type: "text" | "code";
    content: string;
    lang?: string;
  }> = [];

  let lastIndex = 0;

  codeBlocks.forEach((block) => {
    // Add text before code block
    if (block.start > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, block.start),
      });
    }

    // Add code block
    parts.push({
      type: "code",
      content: block.code,
      lang: block.lang,
    });

    lastIndex = block.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return parts;
};

// Simple markdown detection (excluding code blocks)
const isMarkdown = (text: string) => {
  // Remove code blocks for detection
  const textWithoutCodeBlocks = text.replace(/```[\s\S]*?```/g, "");

  const markdownPatterns = [
    /#{1,6}\s+/, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /\[.*?\]\(.*?\)/, // Links
    /`.*?`/, // Inline code
    /^\s*[-*+]\s+/m, // Unordered lists
    /^\s*\d+\.\s+/m, // Ordered lists
    /^\s*>\s+/m, // Blockquotes
  ];

  return markdownPatterns.some((pattern) =>
    pattern.test(textWithoutCodeBlocks),
  );
};

export function Message({ messageId, isSecondToLast }: MessageProps) {
  const ref = useRef<HTMLDivElement>(null);

  // If messageId is provided, get live message from store
  const message = useLiveMessage(messageId);
  const text = message.textContent ?? "";

  const parts = parseContent(text);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    if (isSecondToLast) {
      ref.current.scrollIntoView();
    }
  }, [isSecondToLast, message.sender]);

  const renderPart = (
    part: { type: "text" | "code"; content: string; lang?: string },
    index: number,
  ) => {
    if (part.type === "code") {
      return (
        <div key={index} className="my-3">
          <SyntaxHighlighter
            language={part.lang || "text"}
            theme="catppuccin-mocha"
            className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700"
          >
            {part.content}
          </SyntaxHighlighter>
        </div>
      );
    }

    // Handle text part
    const shouldRenderMarkdown = isMarkdown(part.content);

    if (shouldRenderMarkdown) {
      return (
        <div
          key={index}
          dangerouslySetInnerHTML={{ __html: marked(part.content) }}
          className="prose prose-sm max-w-none [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs data-[sender=user]:[&_code]:bg-white/20"
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
      data-is-last={isSecondToLast}
      data-sender={message.sender}
      ref={ref}
    >
      <div
        className="p-3 text-sm leading-relaxed data-[sender=llm]:mr-auto data-[sender=llm]:w-full data-[sender=llm]:self-start data-[sender=llm]:text-gray-900 data-[sender=user]:inline-block data-[sender=user]:max-w-[80%] data-[sender=user]:self-end data-[sender=user]:rounded-xl data-[sender=user]:border data-[sender=user]:border-secondary/50 data-[sender=user]:bg-secondary/50 data-[sender=user]:px-4 data-[sender=user]:py-3 data-[sender=user]:break-words"
        data-sender={message.sender}
        data-id={message.id}
      >
        {parts.map(renderPart)}
        <div ref={ref} />
      </div>
    </div>
  );
}
