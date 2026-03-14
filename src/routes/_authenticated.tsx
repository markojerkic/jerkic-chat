import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ThreadToolbar } from "~/components/toolbar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { authMiddleware } from "~/server/auth/utils";

export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
  server: {
    middleware: [authMiddleware],
  },
});

function RouteComponent() {
  return (
    <SidebarProvider>
      {/* <AppSidebar threads={[]} /> */}
      <ThreadToolbar />
      <SidebarInset className="h-screen pt-4">
        <div className="h-full overflow-hidden rounded-tl-xl border-t border-l border-muted">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
