import { observer } from "mobx-react-lite";
import {
  Children,
  isValidElement,
  useDeferredValue,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AIReasoningBlock } from "./ai-reasoning-block";
import { CodeBlock } from "./code-block";
import { ToolCallBlock } from "./tool-call-block";

type MarkdownMessageProps = {
  text: string;
  streaming: boolean;
};

type MessageSegment = {
  type: "markdown" | "ai-reasoning" | "tool-call";
  content: string;
};

const markdownPlugins = [remarkGfm];
const specialBlockStartPattern = /^<div class="(ai-reasoning|tool-call)">(.*)$/;
const fencePattern = /^(`{3,}|~{3,})/;
const languageAliases: Record<string, string> = {
  c: "c",
  "c#": "csharp",
  "c++": "cpp",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  tsx: "tsx",
  zsh: "bash",
};

export const MarkdownMessage = observer(function MarkdownMessage({
  text,
  streaming,
}: MarkdownMessageProps) {
  const deferredText = useDeferredValue(text);
  const renderedText = streaming ? deferredText : text;
  const segments = splitMessageSegments(renderedText);

  return (
    <div className="prose prose-sm max-w-none">
      {segments.map((segment, index) => {
        const key = `${segment.type}-${index}`;

        if (segment.type === "markdown") {
          return (
            <MarkdownContent
              key={key}
              content={segment.content}
              streaming={streaming}
            />
          );
        }

        if (segment.type === "ai-reasoning") {
          return (
            <AIReasoningBlock key={key}>
              <MarkdownContent
                content={trimWrappedBlock(segment.content)}
                streaming={streaming}
              />
            </AIReasoningBlock>
          );
        }

        return <ToolCallBlock key={key} content={segment.content} />;
      })}
    </div>
  );
});

function MarkdownContent({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  if (!content.trim()) {
    return null;
  }

  return (
    <ReactMarkdown
      components={getMarkdownComponents(streaming)}
      remarkPlugins={markdownPlugins}
    >
      {content}
    </ReactMarkdown>
  );
}

function getMarkdownComponents(streaming: boolean): Components {
  return {
    pre: ({ children }) => {
      const codeBlock = extractCodeBlock(children);
      if (codeBlock) {
        return (
          <CodeBlock
            code={codeBlock.code}
            lang={codeBlock.lang}
            streaming={streaming}
          />
        );
      }

      return (
        <pre className="bg-chat-accent overflow-x-auto rounded-lg px-[1em] py-[1em]">
          {children}
        </pre>
      );
    },

    code: ({ className, children, ...props }) => (
      <code
        {...props}
        className={["rounded bg-black/10 px-1 py-0.5 text-xs", className]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </code>
    ),

    table: ({ children, ...props }) => (
      <div className="my-4 overflow-clip">
        <div className="border-accent/80 relative w-full overflow-hidden rounded-lg border">
          <div className="scrollbar-transparent relative max-h-[60vh] overflow-auto pb-0">
            <table {...props} className="my-0 w-full caption-bottom text-sm">
              {children}
            </table>
          </div>
        </div>
      </div>
    ),

    thead: ({ children, ...props }) => (
      <thead {...props} className="rounded-t-lg [&_tr]:border-b">
        {children}
      </thead>
    ),

    tbody: ({ children, ...props }) => (
      <tbody {...props} className="[&_tr:last-child]:border-0">
        {children}
      </tbody>
    ),

    tr: ({ children, ...props }) => (
      <tr
        {...props}
        className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors"
      >
        {children}
      </tr>
    ),

    th: ({ children, ...props }) => (
      <th
        {...props}
        className="bg-secondary text-foreground *:[[role=checkbox]]:translate-y-0.5 sticky top-0 h-10 px-2 py-2 text-left align-middle text-sm font-medium first:pl-4 [&:has([role=checkbox])]:pr-0"
      >
        {children}
      </th>
    ),

    td: ({ children, ...props }) => (
      <td
        {...props}
        className="not-last:max-w-[40ch] *:[[role=checkbox]]:translate-y-0.5 min-w-8 overflow-hidden text-ellipsis whitespace-nowrap p-2 text-left align-middle text-sm first:pl-4 [&:has([role=checkbox])]:pr-0"
      >
        {children}
      </td>
    ),

    p: ({ children, ...props }) => (
      <p {...props} className="mb-4 last:mb-0">
        {children}
      </p>
    ),

    h1: ({ children, ...props }) => (
      <h1 {...props} className="mb-4 text-2xl font-bold">
        {children}
      </h1>
    ),

    h2: ({ children, ...props }) => (
      <h2 {...props} className="mb-3 text-xl font-bold">
        {children}
      </h2>
    ),

    h3: ({ children, ...props }) => (
      <h3 {...props} className="mb-3 text-lg font-bold">
        {children}
      </h3>
    ),

    ul: ({ children, ...props }) => (
      <ul {...props} className="mb-4 ml-6 list-disc">
        {children}
      </ul>
    ),

    ol: ({ children, ...props }) => (
      <ol {...props} className="mb-4 ml-6 list-decimal">
        {children}
      </ol>
    ),

    li: ({ children, ...props }) => (
      <li {...props} className="mb-1">
        {children}
      </li>
    ),

    blockquote: ({ children, ...props }) => (
      <blockquote
        {...props}
        className="border-muted-foreground/25 text-foreground/80 border-l-4 pl-4 italic"
      >
        {children}
      </blockquote>
    ),

    a: ({ children, href, ...props }) => (
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
  };
}

function splitMessageSegments(text: string) {
  const lines = text.split(/\r?\n/);
  const segments: MessageSegment[] = [];
  let fence: string | null = null;
  let currentSpecialType: MessageSegment["type"] | null = null;
  let markdownBuffer: string[] = [];
  let specialBuffer: string[] = [];

  const pushMarkdown = () => {
    const content = markdownBuffer.join("\n");
    if (content.trim()) {
      segments.push({ type: "markdown", content });
    }
    markdownBuffer = [];
  };

  const pushSpecial = () => {
    if (currentSpecialType) {
      segments.push({
        type: currentSpecialType,
        content: specialBuffer.join("\n"),
      });
    }

    currentSpecialType = null;
    specialBuffer = [];
  };

  for (const line of lines) {
    if (currentSpecialType) {
      if (!fence) {
        const closeIndex = line.indexOf("</div>");
        if (closeIndex >= 0) {
          const beforeClose = line.slice(0, closeIndex);
          if (beforeClose) {
            specialBuffer.push(beforeClose);
          }
          pushSpecial();

          const trailingContent = line.slice(closeIndex + "</div>".length);
          if (trailingContent) {
            markdownBuffer.push(trailingContent);
          }
          continue;
        }
      }

      specialBuffer.push(line);
      fence = updateFenceState(fence, line);
      continue;
    }

    if (!fence) {
      const match = line.trim().match(specialBlockStartPattern);
      if (match) {
        const type = match[1] as Exclude<MessageSegment["type"], "markdown">;
        const remainder = match[2] ?? "";
        const closeIndex = remainder.indexOf("</div>");

        pushMarkdown();

        if (closeIndex >= 0) {
          segments.push({
            type,
            content: remainder.slice(0, closeIndex),
          });

          const trailingContent = remainder.slice(closeIndex + "</div>".length);
          if (trailingContent) {
            markdownBuffer.push(trailingContent);
          }
          continue;
        }

        currentSpecialType = type;
        if (remainder) {
          specialBuffer.push(remainder);
        }
        continue;
      }
    }

    markdownBuffer.push(line);
    fence = updateFenceState(fence, line);
  }

  if (currentSpecialType) {
    pushSpecial();
  }

  pushMarkdown();

  if (!segments.length) {
    return [{ type: "markdown", content: text }] satisfies MessageSegment[];
  }

  return segments;
}

function updateFenceState(currentFence: string | null, line: string) {
  const trimmedLine = line.trim();
  const match = trimmedLine.match(fencePattern);
  if (!match) {
    return currentFence;
  }

  const nextFence = match[1];
  if (!currentFence) {
    return nextFence;
  }

  return trimmedLine.startsWith(currentFence) ? null : currentFence;
}

function extractCodeBlock(children: ReactNode) {
  const [child] = Children.toArray(children);
  if (!isValidElement<CodeElementProps>(child) || child.type !== "code") {
    return null;
  }

  const langMatch = /language-([^\s]+)/.exec(child.props.className ?? "");

  return {
    code: getTextContent(child.props.children).replace(/\n$/, ""),
    lang: normalizeLanguage(langMatch?.[1] ?? ""),
  };
}

function getTextContent(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return getTextContent(child.props.children);
      }

      return "";
    })
    .join("");
}

function normalizeLanguage(language: string) {
  const normalizedLanguage = language.trim().toLowerCase();
  return languageAliases[normalizedLanguage] ?? normalizedLanguage;
}

function trimWrappedBlock(content: string) {
  return content
    .replace(/^\r?\n/, "")
    .replace(/\r?\n$/, "")
    .trim();
}

type CodeElementProps = ComponentPropsWithoutRef<"code"> & {
  children?: ReactNode;
};
