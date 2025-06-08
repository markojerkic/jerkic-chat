import { useFetcher, type ShouldRevalidateFunction } from "react-router";
import type { Route } from "./+types/thread";
import { getGeminiRespose } from "~/server/google";
import { lazy, Suspense } from "react";
// const Message = lazy(() => import("~/components/message.client"));
import Message from "~/components/message.client";
import { desc } from "drizzle-orm";

export function shouldRevalidate(): ReturnType<ShouldRevalidateFunction> {
  return true;
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const thread = params.threadId;

  context.cloudflare.ctx.waitUntil(getGeminiRespose(context, thread, formData));
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const threadId = params.threadId;

  const messages = await context.db.query.message.findMany({
    where: (m, { eq }) => eq(m.thread, threadId),
    orderBy: (m) => desc(m.id),
  });

  return messages;
}

export default function Thread({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<Route.ActionArgs>();
  return (
    <fetcher.Form
      className="w-screen h-screen bg-gray-50 flex flex-col"
      method="POST"
    >
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="max-w-4xl mx-auto flex flex-col-reverse gap-3">
          <Suspense fallback="Loading">
            {loaderData.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </Suspense>
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <input
            className="
              w-full px-4 py-3 rounded-lg border border-gray-300
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              placeholder-gray-500 text-gray-900
              shadow-sm
            "
            name="q"
            placeholder="Type your message..."
            autoComplete="off"
          />
        </div>
      </div>
    </fetcher.Form>
  );
}
