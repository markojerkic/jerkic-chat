import { createId } from "@paralleldrive/cuid2";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GitBranch } from "lucide-react";
import type { ComponentProps } from "react";
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
  const fn = useServerFn(forkThread);
  const mutation = useMutation({
    mutationKey: ["fork-thread"],
    mutationFn: fn,
    onSuccess: () => {
      alert("forked");
    },
    onError: (err) => {
      console.error("failed fork", err);
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
        // const branchRequest = branchOff(message.thread, message.id);
        // console.log("branchRequest", branchRequest);
        // Optimistically navigate to the new thread
        // TODO: pass title/lastModel as search params once route supports them
        // navigate({
        //   to: "/thread/$threadId",
        //   params: { threadId: branchRequest.newThreadId },
        // });
        // TODO: submit branch to server via TanStack server fn
        // fetcher.submit(branchRequest, { action: "/branch", method: "POST", encType: "application/json" })
        //   .then(() => toast.info("Created a branch"))
        //   .catch((error) => { console.error("Failed to create branch on server:", error); toast.error("Failed to save branch to server. Please retry."); });
      }}
      {...props}
    >
      <GitBranch className="h-3.5 w-3.5" />
    </button>
  );
}
