import { Form, redirect } from "react-router";
import { createThread } from "~/server/create-thread";
import { getGeminiRespose } from "~/server/google";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const thread = await createThread(context);

  context.cloudflare.ctx.waitUntil(
    getGeminiRespose(context, thread, formData, false)
  );

  throw redirect(`/thread/${thread}`);
}

export async function loader({ context }: Route.LoaderArgs) {
  const guestBook = await context.db.query.guestBook.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  return {
    guestBook,
    message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
  };
}

export default function Home({ actionData }: Route.ComponentProps) {
  return (
    <Form className="w-screen h-screen" method="POST">
      <div className="flex flex-col gap-2  p-4 border-blue-300">
        {actionData && <pre>{actionData}</pre>}

        <input className="bg-gray-900" name="q" placeholder="Q" />
      </div>
    </Form>
  );
}
