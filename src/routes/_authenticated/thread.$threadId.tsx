import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { authMiddleware } from "~/server/auth/utils";
import { getModels } from "~/server/llm/models";

const threadData = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      threadId: z.union([z.cuid2(), z.uuidv7()]),
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

      context.db.query.message.findMany({
        where: (m, { eq }) => eq(m.thread, threadId),
        orderBy: (m, { asc }) => asc(m.id),
      }),
    ]);

    return { threadTitle, lastModel, messages };
  });

export const Route = createFileRoute("/_authenticated/thread/$threadId")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    context.queryClient.ensureQueryData({
      queryKey: ["models"],
      queryFn: getModels,
    });

    return await threadData({ data: { threadId: params.threadId } });
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return (
    <>
      <div>Hello "/_authenticated/thread/$threadId"!</div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
