import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "~/components/thread/thread";
import { getModels } from "~/server/llm/models.functions";
import { getInitialThreadData } from "~/server/thread-actions.functions";

export const Route = createFileRoute("/_authenticated/thread/$threadId")({
  component: RouteComponent,
  loader: async ({ context, params: { threadId } }) => {
    context.queryClient.ensureQueryData({
      queryKey: ["models"],
      queryFn: getModels,
    });

    const initialThreadData = await getInitialThreadData({
      data: threadId,
    });

    return initialThreadData;
  },
  preloadStaleTime: 10_000,
});

function RouteComponent() {
  const { messages } = Route.useLoaderData();
  const { threadId } = Route.useParams();

  return <Thread threadId={threadId} history={messages} />;
}
