import { Globe, Search, Wrench } from "lucide-react";

type ToolCallBlockProps = {
  content: string;
};

export function ToolCallBlock({ content }: ToolCallBlockProps) {
  const rawText = content.trim();

  const isFetch = /^fetching\s+/i.test(rawText);
  const isSearch = /^web search\s+/i.test(rawText);

  const title = isFetch ? "Web Fetch" : isSearch ? "Web Search" : "Tool Call";
  const detailText = rawText
    .replace(/^fetching\s+/i, "")
    .replace(/^web search\s+/i, "")
    .trim();

  return (
    <div className="border-secondary/60 bg-secondary/20 my-3 rounded-lg border px-3 py-2">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
        {isFetch ? (
          <Globe className="h-3.5 w-3.5" />
        ) : isSearch ? (
          <Search className="h-3.5 w-3.5" />
        ) : (
          <Wrench className="h-3.5 w-3.5" />
        )}
        <span>{title}</span>
      </div>

      {detailText ? (
        <p className="text-foreground/80 wrap-break-word mt-1 text-sm">
          {detailText}
        </p>
      ) : (
        <div className="text-foreground/80 mt-1 text-sm">{rawText}</div>
      )}
    </div>
  );
}
