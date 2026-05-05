import { Search, Sparkles } from "lucide-react";
import { observer } from "mobx-react-lite";
import type { MessagePartContent } from "~/db/session/schema";

type WebSearchMessagePart = MessagePartContent & {
  type: "web-search";
};
export function isWebSearchMessagePart(
  messagePart: MessagePartContent,
): messagePart is WebSearchMessagePart {
  return messagePart.type === "web-search";
}

type WebSearchBlockProps = {
  messagePart: WebSearchMessagePart;
};
export const WebSearchBlock = observer(function WebSearchBlock({
  messagePart,
}: WebSearchBlockProps) {
  return (
    <div className="border-secondary/60 bg-secondary/20 my-3 overflow-hidden rounded-xl border">
      <div className="from-secondary/80 to-secondary/20 flex items-center gap-2 bg-gradient-to-r px-3 py-2">
        <span className="bg-background/80 text-muted-foreground flex h-7 w-7 items-center justify-center rounded-full shadow-sm">
          <Search className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
            <Sparkles className="h-3 w-3" />
            Searching the web
          </div>
          <div className="text-foreground/80 text-sm">
            Finding relevant sources
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-3 py-2.5">
        {messagePart.search.map((query) => (
          <span
            key={query}
            className="border-border/70 bg-background/70 text-foreground/80 rounded-full border px-2.5 py-1 text-xs shadow-sm"
          >
            {query}
          </span>
        ))}
      </div>
    </div>
  );
});
