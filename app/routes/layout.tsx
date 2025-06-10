import { Outlet, redirect } from "react-router";
import { validateSession } from "~/server/auth/lucia";
import type { Route } from "./+types/layout";

export async function loader({ context, request }: Route.LoaderArgs) {
  const session = await validateSession(context, request);
  if (!session || !session.user) {
    throw redirect("/auth/login");
  }

  return { user: session.user };
}

export default function ChatLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex h-screen w-screen justify-between">
      <aside className="w-60">
        <div className="p-4">User: {loaderData.user.username}</div>
        <div className="p-4">Chat 1</div>
        <div className="p-4">Chat 1</div>
        <div className="p-4">Chat 1</div>
        <div className="p-4">Chat 1</div>
      </aside>
      <main className="grow">
        <Outlet />
      </main>
    </div>
  );
}
