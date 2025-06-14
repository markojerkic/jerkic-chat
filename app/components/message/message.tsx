// app/components/message/message.tsx
import { lazy, Suspense, useEffect, useRef, useState } from "react"; // ✅ Add lazy and Suspense
import type { SavedMessage } from "~/database/schema";
import { useLiveMessage } from "~/store/messages-store";
import { MessageFooter } from "./message-footer";

// 🆕 Lazily load MarkdownRenderer only on the client
const LazyMarkdownRenderer = lazy(() => import("./markdown-renderer.client"));

type MessageProps = {
  messageId: string;
  threadId: string;
  isLast: boolean;
  defaultMessage?: SavedMessage;
};

export default function Message({
  messageId,
  isLast,
  defaultMessage,
}: MessageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const message = useLiveMessage(messageId) ?? defaultMessage;
  const [isHovered, setIsHovered] = useState(false);
  const text = message?.textContent ?? "";

  // State to track if we're on the client (hydrated)
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // We are on the client once this effect runs
    if (!ref.current || !isLast) {
      return;
    }
    if (message.status === "streaming" || isLast) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isLast, message?.status, text]);

  if (!message) {
    return null;
  }

  return (
    <div
      className="flex data-[is-last=true]:min-h-[calc(100vh-20rem)] data-[sender=user]:justify-end data-[sender=user]:text-left"
      data-is-last={isLast}
      data-sender={message.sender}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative p-3 text-sm leading-relaxed data-[sender=llm]:mr-auto data-[sender=llm]:w-full data-[sender=llm]:self-start data-[sender=llm]:text-gray-900 data-[sender=user]:inline-block data-[sender=user]:max-w-[80%] data-[sender=user]:self-end data-[sender=user]:rounded-xl data-[sender=user]:border data-[sender=user]:border-secondary/50 data-[sender=user]:bg-secondary/50 data-[sender=user]:px-4 data-[sender=user]:py-3 data-[sender=user]:break-words"
        data-sender={message.sender}
        data-id={message.id}
      >
        {/* Conditionally render based on sender and client-side */}
        {message.sender === "llm" ? (
          isClient ? ( // Only render MarkdownRenderer if on the client
            <Suspense
              fallback={
                // Placeholder while MarkdownRenderer is loading
                <p className="whitespace-pre-wrap">{text}</p>
              }
            >
              <LazyMarkdownRenderer content={text} />
            </Suspense>
          ) : (
            // On server-side (before hydration), render raw text
            <p className="whitespace-pre-wrap">{text}</p>
          )
        ) : (
          // For user messages, or if not llm, render as plain text
          <p className="whitespace-pre-wrap">{text}</p>
        )}

        {message.status === "streaming" && (
          <div className="my-6 flex items-center justify-start pl-1">
            <div className="dot-animation flex space-x-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
              <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
              <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
            </div>
          </div>
        )}

        <MessageFooter message={message} isHovered={isHovered} text={text} />
        <div ref={ref} />
      </div>
    </div>
  );
}
