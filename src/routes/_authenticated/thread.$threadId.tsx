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
  head: (data) => {
    const title = data.loaderData?.title
      ? `${data.loaderData?.title} | jerkić.chat`
      : undefined;
    return {
      meta: [{ title }],
    };
  },
  preloadStaleTime: 10_000,
});

function RouteComponent() {
  const { messages, lastModel } = Route.useLoaderData();
  const { threadId } = Route.useParams();

  return (
    <Thread threadId={threadId} history={messages} lastModel={lastModel} />
  );
}
