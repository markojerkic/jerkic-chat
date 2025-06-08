import { useFetcher, type ShouldRevalidateFunction } from "react-router";
import type { Route } from "./+types/thread";
import { getGeminiRespose } from "~/server/google";

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
  });

  return messages;
}

export default function Thread({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<Route.ActionArgs>();

  return (
    <fetcher.Form className="w-screen h-screen" method="POST">
      <div className="flex flex-col gap-2  p-4 border-blue-300">
        {loaderData.map((message) => (
          <span
            key={message.id}
            className={message.sender === "user" ? "self-end" : "self-start"}
            data-id={message.id}
          >
            {message.textContent}
          </span>
        ))}

        <input className="bg-gray-900" name="q" placeholder="Q" />
      </div>
    </fetcher.Form>
  );
}
