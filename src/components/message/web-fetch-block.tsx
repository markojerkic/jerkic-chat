import { observer } from "mobx-react-lite";
import type { MessagePartContent } from "~/db/session/schema";

type WebFetchMessagePart = MessagePartContent & {
  type: "web-fetch";
};
export function isWebFetchMessagePart(
  messagePart: MessagePartContent,
): messagePart is WebFetchMessagePart {
  return messagePart.type === "web-fetch";
}

type WebFetchBlockProps = {
  messagePart: WebFetchMessagePart;
};
export const WebFetchBlock = observer(function WebFetchBlock({
  messagePart,
}: WebFetchBlockProps) {
  const domains = messagePart.search
    .map((url) => {
      try {
        return new URL(url).host;
      } catch (e) {
        return null;
      }
    })
    .filter((url) => !!url)
    .join(", ");

  return <span>Fetching: {domains}</span>;
});
