import { createFileRoute } from "@tanstack/react-router";
import { runInAction } from "mobx";
import { useEffect } from "react";
import { Thread } from "~/components/thread/thread";
import {
  ClientMessageContext,
  useWebSocketMessages,
} from "~/hooks/use-ws-messages";
import { getModels } from "~/server/llm/models.functions";
import { getInitialThreadData } from "~/server/thread-actions.functions";

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
  const { chatStore } = Route.useRouteContext();
  const clientMessage = useWebSocketMessages(threadId);

  useEffect(() => {
    runInAction(() => {
      chatStore.clear();
      chatStore.addMessages(messages);
    });
  }, [threadId]);

  return (
    <ClientMessageContext value={clientMessage}>
      <Thread chatStore={chatStore} threadId={threadId} lastModel={lastModel} />
    </ClientMessageContext>
  );
}
