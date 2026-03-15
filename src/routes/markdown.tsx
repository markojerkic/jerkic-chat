import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { useMarkdownComponents } from "~/components/message/message";
import { markdownExample } from "~/markdown-example";

const getMarkdown = createServerFn().handler(() => {
  return markdownExample;
});

export const Route = createFileRoute("/markdown")({
  component: RouteComponent,
  loader: () => getMarkdown(),
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const components = useMarkdownComponents("llm");

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {data}
      </ReactMarkdown>
    </div>
  );
}
