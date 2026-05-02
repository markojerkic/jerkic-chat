import { createId } from "@paralleldrive/cuid2";
import { createFileRoute } from "@tanstack/react-router";
import { useContext } from "react";
import { Thread } from "~/components/thread/thread";
import { getModels } from "~/server/llm/models.functions";
import { ChatContext } from "~/store/chat";

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
  const chatStore = useContext(ChatContext);

  return (
    <Thread threadId={threadId} chatStore={chatStore} lastModel={undefined} />
  );
}
