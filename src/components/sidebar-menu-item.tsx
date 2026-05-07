import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { GitBranch, X } from "lucide-react";
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
import { deleteThread } from "~/server/thread-actions.functions";
import { Button } from "./ui/button";
import { SidebarMenuItem } from "./ui/sidebar";
import { TooltipTrigger } from "./ui/tooltip";

export type ThreadMenuItemProps = {
  thread: {
    id: string;
    title: string | null;
    isBranch?: boolean | null;
  };
  isActive: boolean;
};

export function ThreadMenuItem({ thread, isActive }: ThreadMenuItemProps) {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteThread);
  const deleteThreadMutation = useMutation({
    mutationKey: ["delete-thread"],
    mutationFn: deleteFn,
    onError: (error) => {
      console.error("Delete thread failed", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const submitDelete = () => {
    deleteThreadMutation.mutate({
      data: {
        threadId: thread.id,
      },
    });
  };

  if (deleteThreadMutation.isSuccess) {
    return null;
  }

  return (
    <SidebarMenuItem className="group/menu-item hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:focus-visible:bg-sidebar-accent relative flex items-center gap-2 overflow-hidden">
      <Link
        data-is-active={isActive}
        to="/thread/$threadId"
        params={{
          threadId: thread.id,
        }}
        preload="intent"
        className="group/link focus-visible:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring data-[is-active=true]:bg-sidebar-accent data-[is-active=true]:text-sidebar-accent-foreground data-[is-active=true]:focus-visible:bg-sidebar-accent relative flex h-9 w-full items-center overflow-hidden rounded-lg p-2 py-1 text-sm outline-none focus-visible:ring-2"
      >
        <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
          {thread.isBranch && <GitBranch className="h-3.5 w-3.5 shrink-0" />}

          <span className="min-w-0 shrink truncate">
            {thread.title ?? thread.id}
          </span>
        </div>
      </Link>
      <div className="text-muted-foreground group-hover/menu-item:bg-sidebar-accent p-1.5! pointer-events-none absolute bottom-0 right-1 top-0 z-50 flex translate-x-full items-center justify-end transition-transform group-hover/menu-item:pointer-events-auto group-hover/menu-item:translate-x-0">
        <div className="from-sidebar-accent bg-linear-to-l pointer-events-none absolute bottom-0 right-full top-0 h-full w-8 to-transparent opacity-0 group-hover/link:opacity-100"></div>
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
                className="h-7 w-7 p-1.5"
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
