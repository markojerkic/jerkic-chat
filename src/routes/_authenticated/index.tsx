import { createId } from "@paralleldrive/cuid2";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import Thread from "~/components/thread/thread";
import { getModels } from "~/server/bindings/llm-models";

const threadId = createServerFn().handler(() => {
  return createId();
});

export const Route = createFileRoute("/_authenticated/")({
  component: RouteComponent,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData({
      queryKey: ["models"],
      queryFn: getModels,
    });

    return threadId();
  },
});

function RouteComponent() {
  const threadId = Route.useLoaderData();

  return <Thread threadId={threadId} history={[]} />;
}
