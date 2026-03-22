import Markdown, { type MarkdownToJSX } from "markdown-to-jsx/react";
import { useEffect, useRef } from "react";
import type { SavedMessage } from "~/db/d1/schema";
import { useMessage } from "~/store/message";
import { AIReasoningBlock } from "./ai-reasoning-block";
import { AttachedFiles } from "./attachment-files";
import { CodeBlock } from "./code-block";
import { MessageFooter } from "./message-footer";

type MessageProps = {
  messageId: string;
  isLast: boolean;
  message?: SavedMessage;
};

export function Message({
  message: historyMessage,
  messageId,
  isLast,
}: MessageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const message = historyMessage ?? useMessage(messageId);

  const status = message?.status;
  const sender = message?.sender;

  useEffect(() => {
    if (!ref.current || !isLast) {
      return;
    }
    // ref.current.scrollIntoView();
  }, [isLast, sender]);

  return (
    <div
      className="group flex data-[is-last=true]:min-h-[calc(100vh-20rem)] data-[sender=user]:justify-end data-[sender=user]:text-left"
      data-is-last={isLast}
      data-sender={sender}
    >
      <div
        className="data-[sender=user]:border-secondary/50 data-[sender=user]:bg-secondary/50 data-[sender=user]:wrap-break-word relative p-3 text-sm leading-relaxed data-[sender=llm]:mr-auto data-[sender=user]:inline-block data-[sender=llm]:w-full data-[sender=user]:max-w-[80%] data-[sender=llm]:self-start data-[sender=user]:self-end data-[sender=user]:rounded-xl data-[sender=user]:border data-[sender=user]:px-4 data-[sender=user]:py-3 data-[sender=llm]:text-gray-900"
        data-sender={sender}
        data-id={messageId}
      >
        <MessageContent messageId={messageId} historyMessage={historyMessage} />

        {status === "streaming" && (
          <div className="my-6 flex items-center justify-start pl-1">
            <div className="dot-animation flex space-x-1">
              <span className="bg-muted-foreground h-2 w-2 rounded-full"></span>
              <span className="bg-muted-foreground h-2 w-2 rounded-full"></span>
              <span className="bg-muted-foreground h-2 w-2 rounded-full"></span>
            </div>
          </div>
        )}

        <MessageFooter messageId={messageId} historyMessage={historyMessage} />
        {message?.messageAttachemts &&
          message.messageAttachemts?.length > 0 && (
            <div className="-mb-6 flex flex-col gap-2">
              <AttachedFiles
                files={message.messageAttachemts}
                messageId={messageId}
              />
            </div>
          )}
        <div ref={ref} />
      </div>
    </div>
  );
}

function MessageContent({
  messageId,
  historyMessage,
}: {
  messageId: string;
  historyMessage: SavedMessage | undefined;
}) {
  const message = historyMessage ?? useMessage(messageId);
  const sender = message.sender;
  const text = message.textContent;
  // const components = useMarkdownComponents(sender);

  if (sender === "llm" && text) {
    return (
      <div className="prose prose-sm max-w-none">
        <Markdown options={{ overrides: markdownToJsxOptions }}>
          {text}
        </Markdown>
      </div>
    );
  }

  // if (sender === "llm") {
  //   return (
  //     <div className="prose prose-sm max-w-none">
  //       <ReactMarkdown
  //         remarkPlugins={[remarkGfm]}
  //         rehypePlugins={[rehypeRaw]}
  //         components={components}
  //       >
  //         {text}
  //       </ReactMarkdown>
  //     </div>
  //   );
  // }

  return <pre className="whitespace-pre-wrap font-mono">{text}</pre>;
}

export const markdownToJsxOptions: MarkdownToJSX.Overrides = {
  div: {
    component: ({ node, className, children, ...props }) => {
      const match = /ai-reasoning/.exec(className || "");
      if (match) {
        return <AIReasoningBlock>{children}</AIReasoningBlock>;
      }
      return <div {...props}>{children}</div>;
    },
  },

  code: {
    component: ({ node, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match ? match[1] : "";
      const isBlockCode = className && className.startsWith("language-");

      if (isBlockCode) {
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
        <code {...props} className="rounded bg-black/10 px-1 py-0.5 text-xs">
          {children}
        </code>
      );
    },
  },

  table: {
    component: ({ children, ...props }: any) => {
      return (
        <div className="my-4 overflow-clip">
          <div className="border-accent/80 relative w-full overflow-hidden rounded-lg border">
            <div className="scrollbar-transparent relative max-h-[60vh] overflow-auto pb-0">
              <table {...props} className="my-0 w-full caption-bottom text-sm">
                {children}
              </table>
            </div>
          </div>
        </div>
      );
    },
  },

  // Custom thead renderer
  thead: {
    component: ({ children, ...props }: any) => {
      return (
        <thead {...props} className="rounded-t-lg [&_tr]:border-b">
          {children}
        </thead>
      );
    },
  },

  // Custom tbody renderer
  tbody: {
    component: ({ children, ...props }: any) => {
      return (
        <tbody {...props} className="[&_tr:last-child]:border-0">
          {children}
        </tbody>
      );
    },
  },

  // Custom tr renderer
  tr: {
    component: ({ children, ...props }: any) => {
      return (
        <tr
          {...props}
          className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors"
        >
          {children}
        </tr>
      );
    },
  },

  // Custom th renderer
  th: {
    component: ({ children, ...props }: any) => {
      return (
        <th
          {...props}
          className="bg-secondary text-foreground *:[[role=checkbox]]:translate-y-0.5 sticky top-0 h-10 px-2 py-2 text-left align-middle text-sm font-medium first:pl-4 [&:has([role=checkbox])]:pr-0"
        >
          {children}
        </th>
      );
    },
  },

  // Custom td renderer
  td: {
    component: ({ children, ...props }: any) => {
      return (
        <td
          {...props}
          className="not-last:max-w-[40ch] *:[[role=checkbox]]:translate-y-0.5 min-w-8 overflow-hidden text-ellipsis whitespace-nowrap p-2 text-left align-middle text-sm first:pl-4 [&:has([role=checkbox])]:pr-0"
        >
          {children}
        </td>
      );
    },
  },

  // Style other elements to match your current design
  p: {
    component: ({ children, ...props }: any) => (
      <p {...props} className="mb-4 last:mb-0">
        {children}
      </p>
    ),
  },

  h1: {
    component: ({ children, ...props }: any) => (
      <h1 {...props} className="mb-4 text-2xl font-bold">
        {children}
      </h1>
    ),
  },

  h2: {
    component: ({ children, ...props }: any) => (
      <h2 {...props} className="mb-3 text-xl font-bold">
        {children}
      </h2>
    ),
  },

  h3: {
    component: ({ children, ...props }: any) => (
      <h3 {...props} className="mb-3 text-lg font-bold">
        {children}
      </h3>
    ),
  },

  ul: {
    component: ({ children, ...props }: any) => (
      <ul {...props} className="mb-4 ml-6 list-disc">
        {children}
      </ul>
    ),
  },

  ol: {
    component: ({ children, ...props }: any) => (
      <ol {...props} className="mb-4 ml-6 list-decimal">
        {children}
      </ol>
    ),
  },

  li: {
    component: ({ children, ...props }: any) => (
      <li {...props} className="mb-1">
        {children}
      </li>
    ),
  },

  blockquote: {
    component: ({ children, ...props }: any) => (
      <blockquote {...props} className="border-l-4 border-gray-300 pl-4 italic">
        {children}
      </blockquote>
    ),
  },

  a: {
    component: ({ children, href, ...props }: any) => (
      <a
        {...props}
        href={href}
        className="text-blue-600 underline hover:text-blue-800"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  },
};
