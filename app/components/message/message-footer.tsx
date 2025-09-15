import { Copy, GitBranch } from "lucide-react";
import { useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";
import type { SavedMessage } from "~/database/schema";
import { useModel } from "~/hooks/use-models";
import { useBranchOff, useLiveMessages } from "~/store/messages-store";
import { ModelIcon } from "../thread/model-selector";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { RetryMessage } from "./retry-message";

export function MessageFooter({
  message,
  isHovered,
  text,
}: {
  message: SavedMessage;
  isHovered: boolean;
  text: string;
}) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const branchOff = useBranchOff();
  const model = useModel(message.model);

  if (message.sender !== "llm") {
    return null;
  }

  return (
    <div
      data-hide={!isHovered || message.status === "streaming"}
      className="text-md mt-2 flex animate-in items-center justify-between pt-2 text-gray-500 duration-200 fade-in data-[hide=true]:invisible"
    >
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="rounded p-1 transition-colors hover:bg-gray-100"
              onClick={() => {
                navigator.clipboard.writeText(text);
                toast.success("Answer copied to clipboard!");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
        <span className="flex items-center gap-2 text-xs font-light text-muted-foreground">
          <ModelIcon model={message.model} />
          <span>{model?.short_name}</span>
        </span>
        <RetryMessage messageId={message.id} threadId={message.thread} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="rounded p-1 transition-colors hover:bg-gray-100 disabled:bg-gray-200"
              disabled={fetcher.state !== "idle"}
              onClick={() => {
                const branchRequest = branchOff(message.thread, message.id);
                console.log("branchRequest", branchRequest);

                const threadTitle =
                  useLiveMessages.getState().threadNames[message.thread];
                const lastModel = useLiveMessages
                  .getState()
                  .getLastModelOfThread(message.thread);

                // Optimistically navigate to the new thread immediately for speed
                const searchParams = new URLSearchParams();
                searchParams.set("title", threadTitle ?? "New thread");
                searchParams.set("lastModel", lastModel as string);
                navigate(
                  `/thread/${branchRequest.newThreadId}?${searchParams.toString()}`,
                );

                fetcher
                  .submit(branchRequest, {
                    action: "/branch",
                    method: "POST",
                    encType: "application/json",
                  })
                  .then(() => {
                    toast.info("Created a branch");
                  })
                  .catch((error) => {
                    console.error("Failed to create branch on server:", error);
                    toast.error(
                      "Failed to save branch to server. Please retry.",
                    );
                  });
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
