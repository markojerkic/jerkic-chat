import { Link, useParams } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import type { Route } from "../routes/+types/thread";

export function AppSidebar({
  threads,
}: {
  threads: { id: string; title: string | null }[];
}) {
  const params = useParams<Route.ComponentProps["params"]>();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="border-reflect inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[rgb(162,59,103)] p-2 px-4 py-2 text-sm font-semibold whitespace-nowrap text-primary-foreground shadow transition-colors button-reflect select-none hover:bg-[#d56698] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:bg-[rgb(162,59,103)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[rgb(162,59,103)] disabled:active:bg-[rgb(162,59,103)] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
                <Link
                  to={{
                    pathname: `/`,
                  }}
                >
                  New chat
                </Link>
              </SidebarMenuItem>

              {threads.map((thread) => (
                <SidebarMenuItem
                  key={thread.id}
                  className="rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Link
                    data-is-active={
                      params.threadId === thread.id ||
                      (typeof window !== "undefined" &&
                        window.location.pathname.endsWith(thread.id))
                    }
                    to={{
                      pathname: `/thread/${thread.id}`,
                    }}
                    className="relative flex h-9 w-full items-center overflow-hidden rounded-lg px-2 py-1 text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring hover:focus-visible:bg-sidebar-accent data-[is-active=true]:bg-sidebar-accent data-[is-active=true]:text-sidebar-accent-foreground data-[is-active=true]:focus-visible:bg-sidebar-accent"
                    key={thread.id}
                  >
                    {thread.title ?? thread.id}
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
