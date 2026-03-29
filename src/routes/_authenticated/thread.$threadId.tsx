import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { Thread } from "~/components/thread/thread";
import type { SavedMessage } from "~/db/d1/schema";
import { authMiddleware } from "~/server/auth/utils";
import { getModels } from "~/server/llm/models.functions";
import { getThreadSession } from "~/server/thread-actions.functions";

const threadData = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    v.object({
      threadId: v.union([
        v.pipe(v.string(), v.cuid2()),
        v.pipe(v.string(), v.uuid()),
      ]),
    }),
  )
  .handler(async ({ data: { threadId }, context }) => {
    const [threadTitle, lastModel, messages] = await Promise.all([
      context.db.query.thread
        .findFirst({
          where: (t, { eq }) => eq(t.id, threadId),
          columns: { title: true },
        })
        .then((t) => t?.title),

      context.db.query.message
        .findFirst({
          where: (m, { eq }) => eq(m.thread, threadId),
          columns: { model: true },
          orderBy: (m, { desc }) => desc(m.id),
        })
        .then((m) => m?.model as string | undefined),

      getThreadSession({ data: { threadId } }),
    ]);

    const history: SavedMessage[] = Array.from(messages).map((message) => ({
      ...message,
      thread: threadId,
    }));

    return { threadTitle, lastModel, messages: history };
  });

export const Route = createFileRoute("/_authenticated/thread/$threadId")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    context.queryClient.ensureQueryData({
      queryKey: ["models"],
      queryFn: getModels,
    });

    const data = await threadData({ data: { threadId: params.threadId } });
    // context.chatStore.getState().addMessages(params.threadId, data.messages);

    return data;
  },
  preloadStaleTime: 10_000,
});

function RouteComponent() {
  const { messages } = Route.useLoaderData();
  const { threadId } = Route.useParams();

  return (
    <>
      <Thread threadId={threadId} history={messages} />
    </>
  );
}
