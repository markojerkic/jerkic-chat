import { observer } from "mobx-react-lite";
import type { MessagePartContent } from "~/db/session/schema";
import { Badge } from "../ui/badge";

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
  const urls = messagePart.search
    .map((href) => {
      try {
        const url = new URL(href);
        return {
          href,
          domain: url.host.replace(/^www\./, ""),
          favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`,
        };
      } catch (e) {
        return null;
      }
    })
    .filter((url) => !!url);

  if (urls.length === 0) {
    return null;
  }

  return (
    <div className="my-2 flex min-w-0 items-center gap-1.5 overflow-hidden">
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Fetching
      </span>

      {urls.map((url) => (
        <Badge key={url.href} variant="secondary" asChild>
          <a href={url.href} target="_blank" rel="noreferrer" title={url.href}>
            <img
              src={url.favicon}
              alt=""
              className="h-3 w-3 rounded-sm"
              loading="lazy"
            />
            <span className="truncate">{url.domain}</span>
          </a>
        </Badge>
      ))}
    </div>
  );
});
