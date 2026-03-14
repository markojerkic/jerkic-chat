import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const test = createServerFn().handler(({ context }) => {
  console.log("index", context);
  return "marko";
});

export const Route = createFileRoute("/_authenticated/")({
  component: RouteComponent,
  loader: () => test(),
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
