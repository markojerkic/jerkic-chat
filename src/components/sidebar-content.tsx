import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "lucia";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
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
import { getUserThreads } from "~/server/thread-actions.functions";
import { ThreadMenuItem } from "./sidebar-menu-item";
import { Input } from "./ui/input";

type AppSideBarProps = {
  user: User;
  activeThread: string | undefined;
};

export function AppSidebar({ user, activeThread }: AppSideBarProps) {
  const threadsFn = useServerFn(getUserThreads);
  const threads = useInfiniteQuery({
    queryKey: ["threads"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => threadsFn({ data: { page: pageParam } }),
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (!lastPage.hasNextPage) {
        return undefined;
      }
      return lastPageParam + 1;
    },
  });

  const [threadFilter, setThreadFilter] = useState<string>();
  const debouncedFilter = useDebounce(threadFilter);

  const filteredThreads = useMemo(() => {
    const allThreads = threads.data?.pages.flatMap((page) => page.threads);

    if (!debouncedFilter) {
      return allThreads;
    }

    return allThreads?.filter((thread) =>
      thread.title?.toLowerCase().includes(debouncedFilter.toLowerCase()),
    );
  }, [threads.data, debouncedFilter]);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu className="gap-2 py-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Logo />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link
                className="border-reflect text-primary-foreground button-reflect focus-visible:ring-ring inline-flex h-9 w-full select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[rgb(162,59,103)] p-2 px-4 py-2 text-sm font-semibold shadow transition-colors hover:bg-[#d56698] focus-visible:outline-none focus-visible:ring-1 active:bg-[rgb(162,59,103)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[rgb(162,59,103)] disabled:active:bg-[rgb(162,59,103)] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                to="/"
              >
                New chat
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="border-muted/70 relative border-b-[0.5px]">
              <Search className="size-3.5! text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
              <Input
                className="text-foreground placeholder-muted-foreground/50 w-full border-none bg-transparent py-1.5 pl-9 text-xs placeholder:select-none placeholder:text-xs focus:shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
              {filteredThreads?.map((thread) => (
                <ThreadMenuItem
                  thread={thread}
                  key={thread.id}
                  isActive={thread.id === activeThread}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className="hover:bg-sidebar-accent focus:bg-sidebar-accent flex select-none flex-row items-center justify-between gap-3 rounded-lg px-3 py-3 focus:outline-2">
          <div className="flex w-full min-w-0 flex-row items-center gap-3">
            <img
              src={`https://avatars.githubusercontent.com/u/${Math.trunc(user.githubId)}`}
              alt={`${user.username}'s avatar`}
              width={32}
              height={32}
              loading="lazy"
              className="ring-muted-foreground/20 h-8 w-8 rounded-full object-cover ring-1"
            />
            <div className="text-foreground flex min-w-0 flex-col">
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
        className="text-foreground mx-auto mb-2 flex flex-col items-center font-semibold"
        to="/"
        data-discover="true"
      >
        <span className="select-none text-lg font-bold tracking-tight text-[--wordmark-color]">
          jerkić.chat
        </span>
        <span className="text-muted-foreground text-xs font-light">
          A clone of T3 Chat
        </span>
      </Link>
    </div>
  );
}
