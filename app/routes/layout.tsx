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

  return { user: session.user };
}

export default function ChatLayout({ loaderData }: Route.ComponentProps) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
