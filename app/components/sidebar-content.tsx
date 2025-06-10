import { Home } from "lucide-react";
import { Link, useParams } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={{
                      pathname: `/`,
                    }}
                  >
                    <Home />
                    New chat
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {threads.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={params.threadId === thread.id}
                    className="data-[active=true]:opacity-100"
                  >
                    <Link
                      to={{
                        pathname: `/thread/${thread.id}`,
                      }}
                    >
                      {thread.title ?? thread.id}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
