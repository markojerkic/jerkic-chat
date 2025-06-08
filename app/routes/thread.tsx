import { useFetcher } from "react-router";
import type { Route } from "./+types/thread";
import { getGeminiRespose } from "~/server/google";
import { Suspense, useEffect, useRef } from "react";
import { Message } from "~/components/message";
import { asc } from "drizzle-orm";

export async function action({ request, params, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const thread = params.threadId;

  context.cloudflare.ctx.waitUntil(getGeminiRespose(context, thread, formData));
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const threadId = params.threadId;

  const messages = await context.db.query.message.findMany({
    where: (m, { eq }) => eq(m.thread, threadId),
    orderBy: (m) => asc(m.id),
  });

  return messages;
}

export default function Thread({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<Route.ActionArgs>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollContainerRef.current?.scrollIntoView();
  }, [loaderData, scrollContainerRef]);

  return (
    <div className="relative w-full h-screen bg-gray-50">
      <div className="relative bottom-0 top-0 w-full overflow-y-auto border-l border-t border-gray-200 bg-gray-50 pb-[80px] transition-all ease-in-out max-sm:border-none sm:rounded-tl-xl">
        <div className="min-h-full flex flex-col justify-end">
          <div className="w-full flex flex-col gap-3 p-4">
            <Suspense fallback="Loading">
              {loaderData.map((message) => (
                <Message key={message.id} message={message} />
              ))}

              <div ref={scrollContainerRef} />
            </Suspense>
          </div>
        </div>
      </div>

      <fetcher.Form
        className="sticky bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4"
        method="POST"
      >
        <div className="w-full px-4">
          <input
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900 shadow-sm"
            name="q"
            placeholder="Type your message..."
            autoComplete="off"
          />
        </div>
      </fetcher.Form>
    </div>
  );
}
