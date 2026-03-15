import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Check, Copy, WrapText } from "lucide-react";
import { Fragment, Suspense, use, useState, type JSX } from "react";
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

  // // Seed from cache immediately on mount — remounted blocks render without a flash
  // const [highlightedHTML, setHighlightedHtml] = useState<JSX.Element>(
  //   () => highlightCache.get(`${lang}:${code}`) ?? fallbackElement(code),
  // );

  const debouncedCode = useDebounce(code, 100);

  // useEffect(() => {
  //   let cancelled = false;
  //
  //   const cacheKey = `${lang}:${debouncedCode}`;
  //   const cached = highlightCache.get(cacheKey);
  //   if (cached) {
  //     setHighlightedHtml(cached);
  //     return;
  //   }
  //
  //   highlightCode(debouncedCode, lang)
  //     .then((html) => {
  //       if (!cancelled) {
  //         startTransition(() => setHighlightedHtml(html));
  //       }
  //     })
  //     .catch(() => {
  //       if (!cancelled) {
  //         startTransition(() =>
  //           setHighlightedHtml(fallbackElement(debouncedCode)),
  //         );
  //       }
  //     });
  //
  //   return () => {
  //     cancelled = true;
  //   };
  // }, [debouncedCode, lang]);

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
        <div className="bg-secondary text-secondary-foreground absolute inset-x-0 top-0 flex h-9 items-center justify-between rounded-t px-4 py-2 text-sm">
          <span className="font-mono">{lang || "text"}</span>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "hover:bg-muted-foreground/10 hover:text-muted-foreground focus-visible:ring-ring inline-flex size-8 items-center justify-center gap-2 whitespace-nowrap rounded-md p-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
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
                  className="bg-secondary hover:bg-muted-foreground/10 hover:text-muted-foreground focus-visible:ring-ring inline-flex size-8 items-center justify-center gap-2 whitespace-nowrap rounded-md p-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="animate-in zoom-in-50 size-4 duration-300 ease-out" />
                  ) : (
                    <Copy className="animate-in zoom-in-50 size-4 duration-300 ease-out" />
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
            "shiki not-prose bg-chat-accent text-secondary-foreground [&_pre]:bg-transparent! relative text-sm font-[450] [&_pre]:px-[1em] [&_pre]:py-[1em]",
            wrapped
              ? "[&_pre]:wrap-break-word [&_pre]:overflow-visible [&_pre]:whitespace-pre-wrap"
              : "[&_pre]:overflow-auto [&_pre]:whitespace-pre",
          )}
        >
          <Suspense>
            <HighlightedCode content={debouncedCode} lang={lang} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

function HighlightedCode({ content, lang }: { content: string; lang: string }) {
  const highlightedHTML = use(highlightCode(content, lang));

  return highlightedHTML;
}

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
initHighlighter();

const fallbackElement = (code: string) => (
  <pre className="overflow-x-auto rounded-lg border bg-gray-100 p-4 dark:bg-gray-900">
    <code>{code}</code>
  </pre>
);

// Highlight code, returning a cached result immediately if available
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

    const result = toJsxRuntime(out, {
      Fragment,
      jsx,
      jsxs,
    }) as JSX.Element;

    return result;
  } catch (error) {
    return fallbackElement(code);
  }
};
