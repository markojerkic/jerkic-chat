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
  return <span>Searching: {messagePart.search.join(", ")}</span>;
});
