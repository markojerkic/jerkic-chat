import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import useDebounce from "~/hooks/use-debounce";
import type { Route } from "../routes/+types/layout";
import { ThreadMenuItem } from "./sidebar-menu-item";
import { Input } from "./ui/input";

export function AppSidebar({
  threads,
  user,
  avatarUrl,
}: Route.ComponentProps["loaderData"]) {
  const [threadFilter, setThreadFilter] = useState<string>();
  const debouncedFilter = useDebounce(threadFilter);

  const filteredThreads = useMemo(() => {
    if (!debouncedFilter) {
      return threads;
    }

    return threads.filter((thread) =>
      thread.title?.toLowerCase().includes(debouncedFilter.toLowerCase()),
    );
  }, [threads, debouncedFilter]);

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
          <SidebarMenuItem>
            <div className="relative border-b-[0.5px] border-muted/70">
              <Search className="absolute top-1/2 left-2 !size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-full border-none bg-transparent py-1.5 pl-9 text-xs text-foreground placeholder-muted-foreground/50 placeholder:text-xs placeholder:select-none focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Search threads"
                value={threadFilter}
                onChange={(e) => setThreadFilter(e.currentTarget.value)}
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="scroll-shadow">
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {filteredThreads.map((thread) => (
                <ThreadMenuItem thread={thread} key={thread.id} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className="flex flex-row items-center justify-between gap-3 rounded-lg px-3 py-3 select-none hover:bg-sidebar-accent focus:bg-sidebar-accent focus:outline-2">
          <div className="flex w-full min-w-0 flex-row items-center gap-3">
            <img
              src={avatarUrl}
              alt={`${user.username}'s avatar`}
              width={32}
              height={32}
              loading="lazy"
              className="h-8 w-8 rounded-full object-cover ring-1 ring-muted-foreground/20"
            />
            <div className="flex min-w-0 flex-col text-foreground">
              <span className="truncate text-sm font-medium">
                {user.username}
              </span>
              <span className="text-xs">The only user 😊</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
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
