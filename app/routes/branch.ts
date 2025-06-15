import { redirect } from "react-router";
import * as v from "valibot";
import {
  message as messageTable,
  thread as threadTable,
  type SaveMessageInput,
} from "~/database/schema";
import { validateSession } from "~/server/auth/lucia";
import type { Route } from "./+types/branch";

const messageMappingSchema = v.object({
  from: v.pipe(v.string(), v.uuid()),
  to: v.pipe(v.string(), v.uuid()),
});

const schema = v.object({
  fromThreadId: v.pipe(v.string(), v.uuid()),
  newThreadId: v.pipe(v.string(), v.uuid()),
  mappings: v.array(messageMappingSchema),
});
export type BranchRequest = v.InferInput<typeof schema>;

export async function action({ request, context }: Route.ActionArgs) {
  const session = await validateSession(context, request);
  if (!session || !session.user) {
    throw redirect("/auth/login");
  }
  const body = await request.json();
  const input = v.parse(schema, body);

  const thread = await context.db.query.thread.findFirst({
    where: (t, { eq }) => eq(t.id, input.fromThreadId),
    with: {
      messages: true,
    },
  });

  if (!thread) {
    throw new Response("Thread not found", { status: 404 });
  }

  if (thread.owner !== session.user.id) {
    throw new Response("You do not have permission to branch this thread", {
      status: 403,
    });
  }

  await context.db.insert(threadTable).values({
    ...thread,
    id: input.newThreadId,
    title: `Branch of ${thread.title}`,
  });

  const newMessages: SaveMessageInput[] = [];
  for (const message of thread.messages) {
    const mapping = input.mappings.find((m) => m.from === message.id);
    if (!mapping) {
      continue;
    }

    newMessages.push({
      ...message,
      id: mapping.to,
      thread: input.newThreadId,
    });
  }

  await context.db.insert(messageTable).values(newMessages);

  return redirect(`/thread/${input.newThreadId}`);
}
