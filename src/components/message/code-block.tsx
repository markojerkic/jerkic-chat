import { Check, Copy, WrapText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HighlightedCode } from "~/components/message/highlighted-code";
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

  const debouncedCode = useDebounce(code, 100);

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

        <div
          className={cn(
            "shiki not-prose bg-chat-accent text-secondary-foreground [&_pre]:bg-transparent! relative text-sm font-[450] [&_pre]:px-[1em] [&_pre]:py-[1em]",
            wrapped
              ? "[&_pre]:wrap-break-word [&_pre]:overflow-visible [&_pre]:whitespace-pre-wrap"
              : "[&_pre]:overflow-auto [&_pre]:whitespace-pre",
          )}
        >
          <HighlightedCode content={debouncedCode} lang={lang} />
        </div>
      </div>
    </div>
  );
};
