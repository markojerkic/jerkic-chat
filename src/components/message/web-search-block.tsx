import { Search } from "lucide-react";
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
    <div className="text-muted-foreground my-2 flex min-w-0 items-center gap-1.5 text-xs">
      <Search className="h-3 w-3 shrink-0" />
      <span className="shrink-0 font-medium">Searching</span>
      <span className="truncate">{messagePart.search.join(", ")}</span>
    </div>
  );
});
