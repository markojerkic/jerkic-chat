import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import Markdown, { type MarkdownToJSX } from "markdown-to-jsx/react";
import { markdownToJsxOptions } from "~/components/message/message";
import { markdownExample } from "~/markdown-example";

// react-markdown 2.7s
const getMarkdown = createServerFn().handler(() => {
  return markdownExample;
});

export const Route = createFileRoute("/markdown")({
  component: RouteComponent,
  loader: () => getMarkdown(),
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return (
    <div className="prose prose-sm max-w-none">
      <Markdown options={options}>{data}</Markdown>
    </div>
  );
}

const options: MarkdownToJSX.Options = {
  overrides: markdownToJsxOptions,
};
