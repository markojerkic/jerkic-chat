import { useNavigate } from "@tanstack/react-router";
import { Copy, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { useModel } from "~/hooks/use-models";
import { useMessage } from "~/store/message";
import { useBranchOff } from "~/store/messages-store";
import { ModelIcon } from "../thread/model-selector";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { RetryMessage } from "./retry-message";

export function MessageFooter({ messageId }: { messageId: string }) {
  // TODO: replace with TanStack Router mutation / server fn when branch action is migrated
  // const fetcher = useFetcher();
  const message = useMessage(messageId);
  const navigate = useNavigate();
  const branchOff = useBranchOff();
  const model = useModel(message.model);

  if (message.sender !== "llm") {
    return null;
  }

  return (
    <div
      data-streaming={message.status === "streaming"}
      className="text-md mt-2 flex items-center justify-between pt-2 text-gray-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100 data-[streaming=true]:invisible"
    >
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="rounded p-1 transition-colors hover:bg-gray-100"
              onClick={() => {
                navigator.clipboard.writeText(message.textContent ?? "");
                toast.success("Answer copied to clipboard!");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
        <span className="text-muted-foreground flex items-center gap-2 text-xs font-light">
          <ModelIcon model={message.model} />
          <span>{model?.short_name}</span>
        </span>
        <RetryMessage messageId={message.id} threadId={message.thread} />
        <Tooltip>
          <TooltipTrigger asChild>
            {/* TODO: re-enable branch submit once /branch is migrated to a TanStack server fn */}
            <button
              className="rounded p-1 transition-colors hover:bg-gray-100 disabled:bg-gray-200"
              onClick={() => {
                const branchRequest = branchOff(message.thread, message.id);
                console.log("branchRequest", branchRequest);

                // Optimistically navigate to the new thread
                // TODO: pass title/lastModel as search params once route supports them
                navigate({
                  to: "/thread/$threadId",
                  params: { threadId: branchRequest.newThreadId },
                });

                // TODO: submit branch to server via TanStack server fn
                // fetcher.submit(branchRequest, { action: "/branch", method: "POST", encType: "application/json" })
                //   .then(() => toast.info("Created a branch"))
                //   .catch((error) => { console.error("Failed to create branch on server:", error); toast.error("Failed to save branch to server. Please retry."); });
              }}
            >
              <GitBranch className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Branch off</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
