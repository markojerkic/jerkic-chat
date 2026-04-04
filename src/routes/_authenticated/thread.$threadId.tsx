import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Thread } from "~/components/thread/thread";
import {
  ClientMessageContext,
  useWebSocketMessages,
} from "~/hooks/use-ws-messages";
import { getModels } from "~/server/llm/models.functions";
import { getInitialThreadData } from "~/server/thread-actions.functions";
import { useClear } from "~/store/message";

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
  ssr: false,
  preloadStaleTime: 10_000,
});

function RouteComponent() {
  const { messages, lastModel } = Route.useLoaderData();
  const { threadId } = Route.useParams();
  const clear = useClear();
  const clientMessage = useWebSocketMessages(threadId);

  useEffect(() => {
    clear();
  }, []);

  return (
    <ClientMessageContext value={clientMessage}>
      <Thread threadId={threadId} history={messages} lastModel={lastModel} />
    </ClientMessageContext>
  );
}
