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
    <div className="my-3 flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Fetching
      </span>

      {urls.map((url) => (
        <a
          key={url.href}
          href={url.href}
          target="_blank"
          rel="noreferrer"
          className="border-secondary/70 bg-secondary/30 hover:bg-secondary/60 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
          title={url.href}
        >
          <img
            src={url.favicon}
            alt=""
            className="h-4 w-4 rounded-sm"
            loading="lazy"
          />
          <span className="truncate">{url.domain}</span>
        </a>
      ))}
    </div>
  );
});
