import ReactMarkdown from "react-markdown";
import rehypeShiki from "@shikijs/rehype";

type MessageProps = {
  message: {
    id: string;
    textContent: string | null;
    sender: "user" | "llm";
    thread: string;
  };
};

// Simple markdown detection
const isMarkdown = (text: string) => {
  const markdownPatterns = [
    /#{1,6}\s+/, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /\[.*?\]\(.*?\)/, // Links
    /`.*?`/, // Inline code
    /```[\s\S]*?```/, // Code blocks
    /^\s*[-*+]\s+/m, // Unordered lists
    /^\s*\d+\.\s+/m, // Ordered lists
    /^\s*>\s+/m, // Blockquotes
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
};

export function Message({ message }: MessageProps) {
  const isServer =
    typeof window === "undefined" || typeof document === "undefined";
  const content = message.textContent;

  console.log("is server", isServer);
  if (!content) {
    return null;
  }

  if (isServer) {
    return content;
  }

  const shouldRenderMarkdown = isMarkdown(content);

  return (
    <div
      className="
        p-3 max-w-md rounded-lg shadow-sm
        data-[sender=user]:bg-blue-600 data-[sender=user]:text-white data-[sender=user]:self-end data-[sender=user]:ml-auto
        data-[sender=llm]:bg-gray-100 data-[sender=llm]:text-gray-900 data-[sender=llm]:self-start data-[sender=llm]:mr-auto
        text-sm leading-relaxed
        border data-[sender=user]:border-blue-700 data-[sender=llm]:border-gray-200
      "
      data-sender={message.sender}
      data-id={message.id}
    >
      {shouldRenderMarkdown ? (
        <ReactMarkdown
          rehypePlugins={[
            [
              rehypeShiki,
              {
                themes: {
                  light: "github-light",
                  dark: "github-dark",
                },
                defaultColor: false,
                langs: [
                  "javascript",
                  "typescript",
                  "jsx",
                  "tsx",
                  "python",
                  "bash",
                  "json",
                  "css",
                  "html",
                ],
              },
            ],
          ]}
          components={{
            // Custom styling for different elements if needed
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              return (
                <code
                  className={`${className || ""} ${
                    isInline
                      ? "bg-black/10 data-[sender=user]:bg-white/20 px-1 py-0.5 rounded text-xs"
                      : ""
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <pre className="whitespace-pre-wrap font-mono">{content}</pre>
      )}
    </div>
  );
}
