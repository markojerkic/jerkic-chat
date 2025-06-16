import { GitBranch, X } from "lucide-react";
import { Link, useFetcher, useParams } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
} from "~/components/ui/tooltip";
import type { SavedThread } from "~/database/schema";
import { usePrefetch } from "~/hooks/use-prefetch";
import type { DeleteThreadSchema } from "~/server/thread-actions";
import type { Route } from "../routes/+types/layout";
import { Button } from "./ui/button";
import { SidebarMenuItem } from "./ui/sidebar";
import { TooltipTrigger } from "./ui/tooltip";

export type ThreadMenuItemProps = {
  thread: SavedThread;
};

export function ThreadMenuItem({ thread }: ThreadMenuItemProps) {
  const params = useParams<Route.ComponentProps["params"]>();
  const fetcher = useFetcher();
  const prefetch = usePrefetch(thread.id);

  const submitDelete = () => {
    const data = {
      threadId: thread.id,
      currentViewingThreadId: params.threadId ?? "",
    } satisfies DeleteThreadSchema;
    fetcher.submit(data, {
      method: "delete",
      action: `/thread/${thread.id}`,
    });
  };

  if (fetcher.state !== "idle") {
    return null;
  }

  const isActive =
    params.threadId === thread.id ||
    (typeof window !== "undefined" &&
      window.location.pathname.endsWith(thread.id));

  return (
    <SidebarMenuItem className="group/menu-item relative flex items-center gap-2 overflow-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:focus-visible:bg-sidebar-accent">
      <Link
        data-is-active={isActive}
        to={{ pathname: `/thread/${thread.id}` }}
        className="group/link relative flex h-9 w-full items-center overflow-hidden rounded-lg p-2 py-1 text-sm outline-none focus-visible:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[is-active=true]:bg-sidebar-accent data-[is-active=true]:text-sidebar-accent-foreground data-[is-active=true]:focus-visible:bg-sidebar-accent"
        onMouseOver={prefetch.prefetch}
      >
        <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
          {thread.isBranch && (
            <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />
          )}

          <span className="min-w-0 flex-shrink truncate">
            {thread.title ?? thread.id}
          </span>
        </div>
      </Link>
      <div className="pointer-events-none absolute top-0 right-1 bottom-0 z-50 flex translate-x-full items-center justify-end !p-1.5 text-muted-foreground transition-transform group-hover/menu-item:pointer-events-auto group-hover/menu-item:translate-x-0 group-hover/menu-item:bg-sidebar-accent">
        <div className="pointer-events-none absolute top-0 right-[100%] bottom-0 h-full w-8 bg-gradient-to-l from-sidebar-accent to-transparent opacity-0 group-hover/link:opacity-100"></div>
        <DeleteActionBtn onDelete={submitDelete} />
      </div>
    </SidebarMenuItem>
  );
}

function DeleteActionBtn({ onDelete }: { onDelete: () => void }) {
  return (
    <TooltipProvider>
      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="h-[28px] w-[28px] p-1.5"
              >
                <X className="size-4" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Delete thread</TooltipContent>
        </Tooltip>
        <AlertDialogContent className="bg-chat-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              thread and all the containing messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
