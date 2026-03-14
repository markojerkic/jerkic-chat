import { redirect } from "react-router";
import * as v from "valibot";
import { validateSession } from "~/server/auth/lucia";
import { retryMessage } from "~/server/llm";
import type { Route } from "./+types/retry-message";

const requestSchema = v.object({
  messageId: v.string(),
  threadId: v.string(),
  model: v.string(),
});

export async function action({ request, context }: Route.ActionArgs) {
  const userSession = await validateSession(context, request);
  if (!userSession?.user) {
    throw redirect("/auth/login");
  }
  const formData = await request.formData();

  const { messageId, threadId, model } = v.parse(
    requestSchema,
    Object.fromEntries(formData.entries()),
  );

  await retryMessage(
    context,
    messageId,
    threadId,
    model as string,
    userSession.user.id,
  );
}
