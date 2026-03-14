import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "~/components/sidebar-content";
import { ThreadToolbar } from "~/components/toolbar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { authMiddleware, getCurrentUser } from "~/server/auth/utils";
import { getUserThreads } from "~/server/thread-actions";

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

  return (
    <SidebarProvider>
      <AppSidebar threads={threads} user={user} />
      <ThreadToolbar />
      <SidebarInset className="h-screen pt-4">
        <div className="border-muted h-full overflow-hidden rounded-tl-xl border-l border-t">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
