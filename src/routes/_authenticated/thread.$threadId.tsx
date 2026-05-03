import { createFileRoute } from "@tanstack/react-router";
import { runInAction } from "mobx";
import { useContext, useEffect } from "react";
import { Thread } from "~/components/thread/thread";
import { getModels } from "~/server/llm/models.functions";
import { getInitialThreadData } from "~/server/thread-actions.functions";
import { ChatContext } from "~/store/chat";

export const Route = createFileRoute("/_authenticated/thread/$threadId")({
  component: RouteComponent,
  loader: async ({ context, params: { threadId } }) => {
    const [, initialThreadData] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["models"],
        queryFn: getModels,
      }),
      getInitialThreadData({
        data: threadId,
      }),
    ]);

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
  const chatStore = useContext(ChatContext);
  // const clientMessage = useWebSocketMessages(threadId);

  useEffect(() => {
    runInAction(() => {
      chatStore.addMessages(threadId, messages);
    });
  }, [threadId]);

  return (
    <Thread chatStore={chatStore} threadId={threadId} lastModel={lastModel} />
  );
}
