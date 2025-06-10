import { desc } from "drizzle-orm";
import { Outlet, redirect } from "react-router";
import { AppSidebar } from "~/components/sidebar-content";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { validateSession } from "~/server/auth/lucia";
import type { Route } from "./+types/layout";

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
  return (
    <SidebarProvider>
      <AppSidebar threads={loaderData.threads} />

      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
