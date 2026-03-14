import { createId } from "@paralleldrive/cuid2";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import Thread from "~/components/thread/thread";

const threadId = createServerFn().handler(() => {
  return createId();
});

export const Route = createFileRoute("/_authenticated/")({
  component: RouteComponent,
  loader: () => threadId(),
});

function RouteComponent() {
  const threadId = Route.useLoaderData();

  return <Thread threadId={threadId} />;
}
