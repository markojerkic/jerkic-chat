import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Check, Copy, WrapText } from "lucide-react";
import { Fragment, useEffect, useState, type JSX } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import {
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
} from "shiki";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import useDebounce from "~/hooks/use-debounce";
import { cn } from "~/lib/utils";

export const CodeBlock = ({
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
  const [highlightedHTML, setHighlightedHtml] = useState<JSX.Element>();
  const debouncedCode = useDebounce(code, 100);

  useEffect(() => {
    let isLatestCall = true;
    if (highlightedHTML !== undefined) {
      setHighlightedHtml(
        <pre className="overflow-x-auto rounded-lg border bg-gray-100 p-4 dark:bg-gray-900">
          <code>{debouncedCode}</code>
        </pre>,
      );
    }
    highlightCode(debouncedCode, lang)
      .then((html) => {
        if (isLatestCall) {
          setHighlightedHtml(html);
        }
      })
      .catch((error) => {
        if (isLatestCall) {
          console.error("Failed to highlight code:", error);
          setHighlightedHtml(
            <pre className="overflow-x-auto rounded-lg border bg-gray-100 p-4 dark:bg-gray-900">
              <code>{debouncedCode}</code>
            </pre>,
          );
        }
      });

    return () => {
      isLatestCall = false;
    };
  }, [debouncedCode, lang]);

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
        >
          {highlightedHTML}
        </div>
      </div>
    </div>
  );
};

export function useProcessMarkdownContent(text: string) {
  try {
    return processContent(text);
  } catch (e) {
    console.log("error parsing markdown", e);
    return [];
  }
}

// Global highlighter instance - initialize immediately
let highlighter: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

const initHighlighter = async () => {
  if (highlighter) return highlighter;

  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["catppuccin-latte"],
      langs: [
        "diff",
        "javascript",
        "typescript",
        "csharp",
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
        "xml",
        "svelte",
        "vue",
        "php",
      ],
    });
  }

  highlighter = await highlighterPromise;
  return highlighter;
};

// Synchronously highlight code if highlighter is ready
const highlightCode = async (
  code: string,
  lang: string,
): Promise<JSX.Element> => {
  if (!highlighter) {
    highlighter = await initHighlighter();
  }

  try {
    if (!highlighter.getLoadedLanguages().includes(lang)) {
      await highlighter.loadLanguage(lang as BundledLanguage);
    }
    const out = highlighter.codeToHast(code, {
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

    return toJsxRuntime(out, {
      Fragment,
      jsx,
      jsxs,
    }) as JSX.Element;
  } catch (error) {
    return (
      <pre className="overflow-x-auto rounded-lg border bg-gray-100 p-4 dark:bg-gray-900">
        <code>{code}</code>
      </pre>
    );
  }
};

// Custom code block component matching T3.chat style

// Extract code blocks and process content with optimistic streaming-friendly parsing
const processContent = (text: string) => {
  const parts: Array<{
    type: "text" | "code" | "table";
    content: string;
    lang?: string;
  }> = [];

  let currentIndex = 0;

  // Regex to match Markdown tables
  // This regex looks for:
  // 1. A header row with columns separated by '|'
  // 2. A separator line (at least three hyphens, with optional colons for alignment, separated by '|')
  // 3. Optional subsequent rows
  const tableRegex =
    /((?:\|(?:[^|\n]+\|)+\n)(?:\|(?::?-+:?\|)+\n)(?:(?:\|(?:[^|\n]+\|)+\n)*))/g;

  // First, find all complete code blocks and tables
  const completeBlocks: Array<{
    start: number;
    end: number;
    type: "code" | "table";
    lang?: string;
    content: string;
  }> = [];

  // Find code blocks
  const completeCodeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let match;
  while ((match = completeCodeBlockRegex.exec(text)) !== null) {
    completeBlocks.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "code",
      lang: match[1] || "text",
      content: match[2].trim(),
    });
  }

  // Find tables
  let tableMatch;
  while ((tableMatch = tableRegex.exec(text)) !== null) {
    completeBlocks.push({
      start: tableMatch.index,
      end: tableMatch.index + tableMatch[0].length,
      type: "table",
      content: tableMatch[0].trim(),
    });
  }

  // Sort the blocks by their start index to process them in order
  completeBlocks.sort((a, b) => a.start - b.start);

  // Process text, handling complete blocks and looking for incomplete ones
  for (let i = 0; i < completeBlocks.length; i++) {
    const block = completeBlocks[i];

    // Add text before this block
    if (block.start > currentIndex) {
      const textContent = text.slice(currentIndex, block.start);
      if (textContent.trim()) {
        parts.push({ type: "text", content: textContent });
      }
    }

    // Add the complete block
    if (block.type === "code") {
      parts.push({
        type: "code",
        content: block.content,
        lang: block.lang,
      });
    } else if (block.type === "table") {
      parts.push({
        type: "table",
        content: block.content,
      });
    }

    currentIndex = block.end;
  }

  // Handle remaining text after all complete blocks
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);

    // Super optimistic detection for streaming:
    // Check for potential code block starts (even partial ones)
    const streamingCodePatterns = [
      // Complete opening with optional content
      /^```(\w+)?\n?([\s\S]*)$/,
      // Partial opening (streaming scenarios)
      /^```(\w+)?$/,
      /^```$/,
      /^``$/,
      /^`$/,
      // Also catch common streaming patterns where text ends with potential code indicators
      /\n```(\w+)?\n?([\s\S]*)$/,
      /\n```(\w+)?$/,
      /\n```$/,
      /\n``$/,
      /\n`$/,
    ];

    // Check for potential table starts (streaming scenarios)
    const streamingTablePatterns = [
      /^\|(?:[^|\n]*\|)+\n/, // Starts with a header-like row
      /^\|/, // Just a pipe, indicating start of a row
    ];

    let foundStreamingBlock = false;

    // Check for streaming code blocks first
    for (const pattern of streamingCodePatterns) {
      const streamingMatch = remainingText.match(pattern);
      if (streamingMatch) {
        const beforeBlock = remainingText.slice(0, streamingMatch.index || 0);

        // Add any text before the potential code block
        if (beforeBlock.trim()) {
          parts.push({ type: "text", content: beforeBlock });
        }

        // Extract language and content
        let lang = "text";
        let content = "";

        if (streamingMatch[1]) {
          lang = streamingMatch[1];
        }

        if (streamingMatch[2] !== undefined) {
          content = streamingMatch[2];
        } else if (streamingMatch[0].includes("\n")) {
          // Handle cases where we have newlines but no explicit content capture
          const parts = streamingMatch[0].split("\n");
          if (parts.length > 1) {
            content = parts.slice(1).join("\n");
          }
        }

        // Add the streaming code block
        parts.push({
          type: "code",
          content: content,
          lang: lang,
        });

        foundStreamingBlock = true;
        break;
      }
    }

    // If no streaming code found, check for streaming tables
    if (!foundStreamingBlock) {
      for (const pattern of streamingTablePatterns) {
        const streamingMatch = remainingText.match(pattern);
        if (streamingMatch) {
          const beforeBlock = remainingText.slice(0, streamingMatch.index || 0);

          // Add any text before the potential table block
          if (beforeBlock.trim()) {
            parts.push({ type: "text", content: beforeBlock });
          }

          // Add the streaming table block
          parts.push({
            type: "table",
            content: streamingMatch[0], // Use the matched content as is
          });

          foundStreamingBlock = true;
          break;
        }
      }
    }

    // If no streaming block pattern found, treat as regular text
    if (!foundStreamingBlock && remainingText.trim()) {
      parts.push({ type: "text", content: remainingText });
    }
  }

  return parts;
};

// Simple markdown detection
export const isMarkdown = (text: string) => {
  const markdownPatterns = [
    /#{1,6}\s+/,
    /\*\*.*?\*\*/,
    /\*.*?\*/,
    /\[.*?\]\(.*?\)/,
    /`.*?`/,
    /^\s*[-*+]\s+/m,
    /^\s*\d+\.\s+/m,
    /^\s*>\s+/m,
    /\|(?:[^|\n]+\|)+\n(?:\|(?:[:-]+\|)+\n)+/, // Table pattern
  ];
  return markdownPatterns.some((pattern) => pattern.test(text));
};
