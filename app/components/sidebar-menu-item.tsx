import { Tooltip, TooltipContent } from "@radix-ui/react-tooltip";
import { X } from "lucide-react"; // Assuming you have lucide-react installed for icons
import { Link, useParams } from "react-router";
import type { Route } from "../routes/+types/layout";
import { Button } from "./ui/button";
import { SidebarMenuItem } from "./ui/sidebar";
import { TooltipTrigger } from "./ui/tooltip";

export type ThreadMenuItemProps = {
  thread: {
    id: string;
    title: string | null;
  };
};

export function ThreadMenuItem({ thread }: ThreadMenuItemProps) {
  const params = useParams<Route.ComponentProps["params"]>();

  const isActive =
    params.threadId === thread.id ||
    (typeof window !== "undefined" &&
      window.location.pathname.endsWith(thread.id));

  return (
    <SidebarMenuItem className="group/menu-item relative flex items-center gap-2">
      <Link
        data-is-active={isActive}
        to={{ pathname: `/thread/${thread.id}` }}
        className="group/link relative flex h-9 w-full items-center overflow-hidden rounded-lg p-2 py-1 text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring hover:focus-visible:bg-sidebar-accent data-[is-active=true]:bg-sidebar-accent data-[is-active=true]:text-sidebar-accent-foreground data-[is-active=true]:focus-visible:bg-sidebar-accent"
      >
        <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {thread.title ?? thread.id}
        </div>

        <div className="pointer-events-auto absolute top-0 right-1 bottom-0 z-50 flex translate-x-full items-center justify-end !p-1.5 text-muted-foreground transition-transform group-hover/link:translate-x-0 group-hover/link:bg-sidebar-accent">
          <div className="pointer-events-none absolute top-0 right-[100%] bottom-0 h-full w-8 bg-gradient-to-l from-sidebar-accent to-transparent opacity-0 group-hover/link:opacity-100"></div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-[28px] w-[28px] p-1.5"
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete thread</TooltipContent>
          </Tooltip>
        </div>
      </Link>
    </SidebarMenuItem>
  );
}
