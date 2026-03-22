import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { AppSidebar } from "~/components/sidebar-content";
import { ThreadToolbar } from "~/components/toolbar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { authMiddleware } from "~/server/.server/auth/utils";
import { getCurrentUser } from "~/server/bindings/auth";
import { getUserThreads } from "~/server/bindings/thread-actions";

export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
  server: {
    middleware: [authMiddleware],
  },
  loader: async () => {
    const [user, threads] = await Promise.all([
      getCurrentUser(),
      getUserThreads({ data: { page: 0 } }),
    ]);
    return { user, threads };
  },
  staleTime: Infinity,
});

function RouteComponent() {
  const { user, threads } = Route.useLoaderData();
  const { threadId } = useParams({ strict: false });

  return (
    <SidebarProvider>
      <AppSidebar threads={threads} user={user} activeThread={threadId} />
      <ThreadToolbar />
      <SidebarInset className="h-screen pt-4">
        <div className="border-muted h-full overflow-hidden rounded-tl-xl border-l border-t">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
