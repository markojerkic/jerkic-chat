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
