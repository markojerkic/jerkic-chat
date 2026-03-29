import { createId } from "@paralleldrive/cuid2";
import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "~/components/thread/thread";
import { getModels } from "~/server/llm/models.functions";

export const Route = createFileRoute("/_authenticated/")({
  component: RouteComponent,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData({
      queryKey: ["models"],
      queryFn: getModels,
    });

    return createId();
  },
});

function RouteComponent() {
  const threadId = Route.useLoaderData();

  return <Thread threadId={threadId} history={[]} lastModel={undefined} />;
}
