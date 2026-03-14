import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "~/components/sidebar-content";
import { ThreadToolbar } from "~/components/toolbar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { authMiddleware, getCurrentUser } from "~/server/auth/utils";

export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
  server: {
    middleware: [authMiddleware],
  },
  loader: () => {
    return getCurrentUser();
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return (
    <SidebarProvider>
      <AppSidebar threads={[]} user={data?.user} />
      <ThreadToolbar />
      <SidebarInset className="h-screen pt-4">
        <div className="h-full overflow-hidden rounded-tl-xl border-t border-l border-muted">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
