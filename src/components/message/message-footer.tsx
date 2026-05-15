import { useParams } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { observer } from "mobx-react-lite";
import { toast } from "sonner";
import { useModel } from "~/hooks/use-models";
import type { ChatMessage } from "~/store/message";
import { ModelIcon } from "../thread/model-selector";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ForkThread } from "./fork-thread";
import { RetryMessage } from "./retry-message";

export const MessageFooter = observer(function MessageFooter({
  message,
}: {
  message: ChatMessage;
}) {
  const { threadId } = useParams({ strict: false });
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
        <RetryMessage messageId={message.id} />
        {threadId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <ForkThread threadId={threadId} targetMessageId={message.id} />
            </TooltipTrigger>
            <TooltipContent>Branch off</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});
