import { createId } from "@paralleldrive/cuid2";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { GitBranch } from "lucide-react";
import type { ComponentProps } from "react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { forkThread } from "~/server/llm.functions";

export function ForkThread({
  threadId,
  targetMessageId,
  className,
  disabled,
  onClick,
  ref,
  ...props
}: {
  threadId: string;
  targetMessageId: string;
} & ComponentProps<"button">) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fn = useServerFn(forkThread);
  const mutation = useMutation({
    mutationKey: ["fork-thread"],
    mutationFn: fn,
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast("Successfully created a fork");
      navigate({
        to: "/thread/$threadId",
        params: {
          threadId: vars.data.newThreadId,
        },
      });
    },
  });

  return (
    <button
      ref={ref}
      className={cn(
        "rounded p-1 transition-colors hover:bg-gray-100 disabled:bg-gray-200",
        className,
      )}
      disabled={mutation.isPending || disabled}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;

        const newId = createId();
        mutation.mutate({
          data: {
            threadId,
            newThreadId: newId,
            targetMessageId,
          },
        });
      }}
      {...props}
    >
      <GitBranch className="h-3.5 w-3.5" />
    </button>
  );
}
