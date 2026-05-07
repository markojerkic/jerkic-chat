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
import { CodeBlock } from "./code-block";

type MarkdownMessageProps = {
  text: string;
  streaming: boolean;
};

const markdownPlugins = [remarkGfm];
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

  return (
    <div className="prose prose-sm max-w-none">
      <MarkdownContent
        content={trimWrappedBlock(deferredText)}
        streaming={streaming}
      />
    </div>
  );
});

export const MarkdownContent = observer(function MarkdownContent({
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
});

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

function extractCodeBlock(children: ReactNode) {
  const [child] = Children.toArray(children);
  if (!isValidElement<CodeElementProps>(child)) {
    return null;
  }

  const langMatch = /language-([^\s]+)/.exec(child.props.className ?? "");
  if (!langMatch) {
    return null;
  }

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

export function trimWrappedBlock(content: string) {
  return content
    .replace(/^\r?\n/, "")
    .replace(/\r?\n$/, "")
    .trim();
}

type CodeElementProps = ComponentPropsWithoutRef<"code"> & {
  children?: ReactNode;
};
