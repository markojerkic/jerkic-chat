import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SavedMessage } from "~/database/schema";
import { useLiveMessage } from "~/store/messages-store";
import { CodeBlock } from "./code-block";
import { MessageFooter } from "./message-footer";

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

  useEffect(() => {
    if (!ref.current || !isLast) {
      return;
    }
    ref.current.scrollIntoView();
  }, [isLast, message.sender]);

  // Custom components for react-markdown
  const components = {
    // Custom code block renderer
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match ? match[1] : "";

      if (!inline && message.sender === "llm") {
        return (
          <CodeBlock
            code={String(children).replace(/\n$/, "")}
            lang={lang || "text"}
            index={0}
          />
        );
      }

      // Inline code
      return (
        <code className="rounded bg-black/10 px-1 py-0.5 text-xs" {...props}>
          {children}
        </code>
      );
    },

    // Custom table renderer - apply your existing table styles
    table: ({ children, ...props }: any) => {
      if (message.sender === "llm") {
        return (
          <div className="my-4 overflow-clip">
            <div className="relative w-full overflow-hidden rounded-lg border border-accent/80">
              <div className="scrollbar-transparent relative z-[1] max-h-[60vh] overflow-auto pb-0">
                <table
                  className="my-0 w-full caption-bottom text-sm"
                  {...props}
                >
                  {children}
                </table>
              </div>
            </div>
          </div>
        );
      }
      return <table {...props}>{children}</table>;
    },

    // Custom thead renderer
    thead: ({ children, ...props }: any) => {
      if (message.sender === "llm") {
        return (
          <thead className="rounded-t-lg [&_tr]:border-b" {...props}>
            {children}
          </thead>
        );
      }
      return <thead {...props}>{children}</thead>;
    },

    // Custom tbody renderer
    tbody: ({ children, ...props }: any) => {
      if (message.sender === "llm") {
        return (
          <tbody className="[&_tr:last-child]:border-0" {...props}>
            {children}
          </tbody>
        );
      }
      return <tbody {...props}>{children}</tbody>;
    },

    // Custom tr renderer
    tr: ({ children, ...props }: any) => {
      if (message.sender === "llm") {
        return (
          <tr
            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
            {...props}
          >
            {children}
          </tr>
        );
      }
      return <tr {...props}>{children}</tr>;
    },

    // Custom th renderer
    th: ({ children, ...props }: any) => {
      if (message.sender === "llm") {
        return (
          <th
            className="sticky top-0 z-[5] h-10 bg-secondary px-2 py-2 text-left align-middle text-sm font-medium text-foreground first:pl-4 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"
            {...props}
          >
            {children}
          </th>
        );
      }
      return <th {...props}>{children}</th>;
    },

    // Custom td renderer
    td: ({ children, ...props }: any) => {
      if (message.sender === "llm") {
        return (
          <td
            className="min-w-8 overflow-hidden p-2 text-left align-middle text-sm text-ellipsis whitespace-nowrap first:pl-4 [&:has([role=checkbox])]:pr-0 [&:not(:last-child)]:max-w-[40ch] [&>[role=checkbox]]:translate-y-[2px]"
            {...props}
          >
            {children}
          </td>
        );
      }
      return <td {...props}>{children}</td>;
    },

    // Style other elements to match your current design
    p: ({ children, ...props }: any) => (
      <p className="mb-4 last:mb-0" {...props}>
        {children}
      </p>
    ),

    h1: ({ children, ...props }: any) => (
      <h1 className="mb-4 text-2xl font-bold" {...props}>
        {children}
      </h1>
    ),

    h2: ({ children, ...props }: any) => (
      <h2 className="mb-3 text-xl font-bold" {...props}>
        {children}
      </h2>
    ),

    h3: ({ children, ...props }: any) => (
      <h3 className="mb-3 text-lg font-bold" {...props}>
        {children}
      </h3>
    ),

    ul: ({ children, ...props }: any) => (
      <ul className="mb-4 ml-6 list-disc" {...props}>
        {children}
      </ul>
    ),

    ol: ({ children, ...props }: any) => (
      <ol className="mb-4 ml-6 list-decimal" {...props}>
        {children}
      </ol>
    ),

    li: ({ children, ...props }: any) => (
      <li className="mb-1" {...props}>
        {children}
      </li>
    ),

    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic" {...props}>
        {children}
      </blockquote>
    ),

    a: ({ children, href, ...props }: any) => (
      <a
        href={href}
        className="text-blue-600 underline hover:text-blue-800"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
  };

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
        {message.sender === "llm" ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {text}
          </ReactMarkdown>
        ) : (
          <pre className="font-mono whitespace-pre-wrap">{text}</pre>
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
