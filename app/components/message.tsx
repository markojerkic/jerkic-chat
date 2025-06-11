import { Check, Copy, WrapText } from "lucide-react";
import { marked } from "marked";
import { useEffect, useMemo, useRef, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { useLiveMessage } from "~/store/messages-store";

type MessageProps = {
  messageId: string;
  isSecondToLast: boolean;
};

// Global highlighter instance - initialize immediately
let highlighter: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

const initHighlighter = async () => {
  if (highlighter) return highlighter;

  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [
        "catppuccin-latte",
        "kanagawa-dragon",
        "rose-pine",
        "rose-pine-dawn",
      ],
      langs: [
        "javascript",
        "typescript",
        "jsx",
        "tsx",
        "html",
        "css",
        "python",
        "java",
        "go",
        "rust",
        "cpp",
        "c",
        "shell",
        "bash",
        "sql",
        "json",
        "yaml",
        "markdown",
        "xml",
        "svelte",
        "vue",
        "php",
        "ruby",
        "swift",
        "kotlin",
        "dart",
        "scala",
        "haskell",
        "elixir",
        "clojure",
        "r",
        "matlab",
        "lua",
        "perl",
        "powershell",
        "dockerfile",
        "nginx",
      ],
    });
  }

  highlighter = await highlighterPromise;
  return highlighter;
};

// Initialize immediately when module loads
initHighlighter();

// Synchronously highlight code if highlighter is ready
const highlightCode = (code: string, lang: string): string => {
  if (!highlighter) {
    // Return unstyled code if highlighter not ready
    return `<pre class="overflow-x-auto rounded-lg bg-gray-100 dark:bg-gray-900 p-4 border"><code>${code}</code></pre>`;
  }

  try {
    return highlighter.codeToHtml(code, {
      lang: lang || "text",
      theme: "catppuccin-latte",
      transformers: [
        {
          pre(node) {
            // Remove default background, add custom classes
            node.properties.style = "";
            node.properties.className = [
              "shiki",
              "not-prose",
              "relative",
              "bg-chat-accent",
              "text-sm",
              "font-[450]",
              "text-secondary-foreground",
              "[&_pre]:overflow-auto",
              "[&_pre]:!bg-transparent",
              "[&_pre]:px-[1em]",
              "[&_pre]:py-[1em]",
            ];
          },
        },
      ],
    });
  } catch (error) {
    return `<pre class="overflow-x-auto rounded-lg bg-gray-100 dark:bg-gray-900 p-4 border"><code>${code}</code></pre>`;
  }
};

// Custom code block component matching T3.chat style
const CodeBlock = ({
  code,
  lang,
  index,
}: {
  code: string;
  lang: string;
  index: number;
}) => {
  const [copied, setCopied] = useState(false);
  const [wrapped, setWrapped] = useState(false);

  const highlightedHTML = useMemo(() => {
    return highlightCode(code, lang);
  }, [code, lang]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="group my-3" key={index}>
      <div className="relative flex w-full flex-col pt-9">
        {/* Header bar matching T3.chat */}
        <div className="absolute inset-x-0 top-0 flex h-9 items-center justify-between rounded-t bg-secondary px-4 py-2 text-sm text-secondary-foreground">
          <span className="font-mono">{lang || "text"}</span>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "inline-flex size-8 items-center justify-center gap-2 rounded-md p-2 text-xs font-medium whitespace-nowrap transition-colors hover:bg-muted-foreground/10 hover:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                    wrapped
                      ? "bg-muted-foreground/20 text-muted-foreground"
                      : "bg-secondary",
                  )}
                  onClick={() => setWrapped((w) => !w)}
                >
                  <WrapText className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Toggle wrap text</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="inline-flex size-8 items-center justify-center gap-2 rounded-md bg-secondary p-2 text-xs font-medium whitespace-nowrap transition-colors hover:bg-muted-foreground/10 hover:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="size-4 animate-in duration-300 ease-out zoom-in-50" />
                  ) : (
                    <Copy className="size-4 animate-in duration-300 ease-out zoom-in-50" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Copy to clipboard</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Code content */}
        <div
          className={cn(
            "shiki not-prose relative bg-chat-accent text-sm font-[450] text-secondary-foreground [&_pre]:!bg-transparent [&_pre]:px-[1em] [&_pre]:py-[1em]",
            wrapped
              ? "[&_pre]:overflow-visible [&_pre]:break-words [&_pre]:whitespace-pre-wrap"
              : "[&_pre]:overflow-auto [&_pre]:whitespace-pre",
          )}
          dangerouslySetInnerHTML={{ __html: highlightedHTML }}
        />
      </div>
    </div>
  );
};

// Extract code blocks and process content
const processContent = (text: string) => {
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const parts: Array<{
    type: "text" | "code";
    content: string;
    lang?: string;
  }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index);
      if (textContent.trim()) {
        parts.push({ type: "text", content: textContent });
      }
    }

    // Add code block
    parts.push({
      type: "code",
      content: match[2].trim(),
      lang: match[1] || "text",
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({ type: "text", content: remainingText });
    }
  }

  return parts;
};

// Simple markdown detection
const isMarkdown = (text: string) => {
  const markdownPatterns = [
    /#{1,6}\s+/,
    /\*\*.*?\*\*/,
    /\*.*?\*/,
    /\[.*?\]\(.*?\)/,
    /`.*?`/,
    /^\s*[-*+]\s+/m,
    /^\s*\d+\.\s+/m,
    /^\s*>\s+/m,
  ];
  return markdownPatterns.some((pattern) => pattern.test(text));
};

export function Message({ messageId, isSecondToLast }: MessageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const message = useLiveMessage(messageId);
  const text = message.textContent ?? "";

  // Process content only when text changes
  const processedParts = useMemo(() => {
    return processContent(text);
  }, [text]);

  useEffect(() => {
    if (!ref.current || !isSecondToLast) return;
    ref.current.scrollIntoView();
  }, [isSecondToLast, message.sender]);

  const renderPart = (
    part: { type: "text" | "code"; content: string; lang?: string },
    index: number,
  ) => {
    if (part.type === "code") {
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
    if (isMarkdown(part.content)) {
      return (
        <div
          key={index}
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
      data-is-last={isSecondToLast}
      data-sender={message.sender}
      ref={ref}
    >
      <div
        className="p-3 text-sm leading-relaxed data-[sender=llm]:mr-auto data-[sender=llm]:w-full data-[sender=llm]:self-start data-[sender=llm]:text-gray-900 data-[sender=user]:inline-block data-[sender=user]:max-w-[80%] data-[sender=user]:self-end data-[sender=user]:rounded-xl data-[sender=user]:border data-[sender=user]:border-secondary/50 data-[sender=user]:bg-secondary/50 data-[sender=user]:px-4 data-[sender=user]:py-3 data-[sender=user]:break-words"
        data-sender={message.sender}
        data-id={message.id}
      >
        {processedParts.map(renderPart)}
        <div ref={ref} />
      </div>
    </div>
  );
}
