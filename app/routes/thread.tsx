import { asc } from "drizzle-orm";
import { redirect } from "react-router";
import Thread from "~/components/thread";
import { validateSession } from "~/server/auth/lucia";
import { getGeminiRespose } from "~/server/google";
import type { Route } from "./+types/thread";

export function shouldRevalidate() {
  return false;
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const thread = params.threadId;
  const userSession = await validateSession(context, request);
  if (!userSession?.user) {
    throw redirect("/auth/login");
  }

  return getGeminiRespose(context, request, thread, userSession.user.id);
}

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const userSession = await validateSession(context, request);
  if (!userSession?.user) {
    throw redirect("/auth/login");
  }

  const threadId = params.threadId;
  const messages = await context.db.query.message.findMany({
    where: (m, { eq }) => eq(m.thread, threadId),
    orderBy: (m) => asc(m.id),
  });
  return messages;
}

export default function ThreadPage({ params }: Route.ComponentProps) {
  return <Thread threadId={params.threadId} />;
}
