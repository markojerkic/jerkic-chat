import { desc } from "drizzle-orm";
import {
  Outlet,
  redirect,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
import { AppSidebar } from "~/components/sidebar-content";
import { ThreadToolbar } from "~/components/toolbar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { useWebSocketMessages } from "~/hooks/use-ws-messages";
import { validateSession } from "~/server/auth/lucia";
import type { Route } from "./+types/layout";

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  if (args.formMethod === "DELETE") {
    return true;
  }

  if (args.currentParams.threadId === args.nextParams.threadId) {
    return false;
  }

  return args.defaultShouldRevalidate;
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const session = await validateSession(context, request);
  if (!session || !session.user) {
    throw redirect("/auth/login");
  }
  const threads = await context.db.query.thread.findMany({
    where: (t, { eq }) => eq(t.owner, session.user.id),
    orderBy: (t) => desc(t.id),
  });
  return { user: session.user, threads };
}

export default function ChatLayout({ loaderData }: Route.ComponentProps) {
  useWebSocketMessages();

  return (
    <SidebarProvider>
      <AppSidebar threads={loaderData.threads} />
      <ThreadToolbar />
      <SidebarInset className="h-screen pt-4">
        <div className="h-full overflow-hidden rounded-tl-xl border-t border-l border-muted">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
