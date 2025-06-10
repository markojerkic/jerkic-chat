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
    <div className="grid h-screen min-h-fit w-full grid-cols-[1fr_auto]">
      <aside className="fixed top-0 max-w-3xl">
        <div className="p-4">User: {loaderData.user.username}</div>
        <div className="p-4">Chat 1</div>
        <div className="p-4">Chat 1</div>
        <div className="p-4">Chat 1</div>
        <div className="p-4">Chat 1</div>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
