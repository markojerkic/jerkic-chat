import { RotateCw } from "lucide-react";
import { useFetcher } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useModelOfMessage, useRetryMessage } from "~/store/messages-store";

type RetryMessageProps = {
  messageId: string;
  threadId: string;
};

export function RetryMessage({ messageId, threadId }: RetryMessageProps) {
  const fetcher = useFetcher();
  const currentModel = useModelOfMessage(messageId);
  const optimisticRetry = useRetryMessage();

  const retryMessage = async (
    messageId: string,
    threadId: string,
    model: string,
  ) => {
    if (fetcher.state !== "idle") {
      return;
    }

    optimisticRetry(messageId, threadId, model);
    fetcher.submit(
      {
        messageId,
        threadId,
        model,
      },
      {
        method: "POST",
        action: "/retry-message",
      },
    );
  };

  if (!currentModel) {
    return null;
  }

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded p-1 transition-colors hover:bg-gray-100"
                disabled={!currentModel || fetcher.state !== "idle"}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Regenerate response</TooltipContent>
        </Tooltip>

        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => retryMessage(messageId, threadId, currentModel)}
          >
            Same model
            {/* ({MODELS[currentModel]?.name}) */}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>With new model</DropdownMenuLabel>
          <DropdownMenuGroup>
            {/* {MODEL_IDS.map((modelId) => ( */}
            {/*   <DropdownMenuItem */}
            {/*     key={modelId} */}
            {/*     onSelect={() => retryMessage(messageId, threadId, modelId)} */}
            {/*   > */}
            {/*     <span className="flex items-center gap-2"> */}
            {/*       <ModelIcon model={modelId} /> */}
            {/*       <span>{MODELS[modelId]?.name}</span> */}
            {/*     </span> */}
            {/*   </DropdownMenuItem> */}
            {/* ))} */}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
