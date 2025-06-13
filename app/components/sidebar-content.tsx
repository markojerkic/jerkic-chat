import { Link, useParams } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent, // Keep if you plan to add a label to the group
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu className="gap-2 py-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Logo />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link
                className="border-reflect inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[rgb(162,59,103)] p-2 px-4 py-2 text-sm font-semibold whitespace-nowrap text-primary-foreground shadow transition-colors button-reflect select-none hover:bg-[#d56698] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:bg-[rgb(162,59,103)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[rgb(162,59,103)] disabled:active:bg-[rgb(162,59,103)] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                to={{
                  pathname: `/`,
                }}
              >
                New chat
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {threads.map((thread) => (
                <SidebarMenuItem
                  className="flex items-center gap-2"
                  key={thread.id}
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
                  >
                    {thread.title ?? thread.id}
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>user</SidebarFooter>
    </Sidebar>
  );
}

function Logo() {
  return (
    <div className="flex h-8 w-full items-center justify-between px-2 transition-opacity delay-75 duration-75">
      <Link
        className="flex flex-1 items-center justify-center font-semibold text-foreground"
        to="/"
        data-discover="true"
      >
        <span className="text-lg font-bold tracking-tight text-[--wordmark-color] select-none">
          jerkic.chat
        </span>
      </Link>
    </div>
  );
}
