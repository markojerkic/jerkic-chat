import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import * as v from "valibot";
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
import { MODEL_IDS, ModelIcon, MODELS } from "~/models/models";
import { useModelOfMessage, useRetryMessage } from "~/store/messages-store";

type RetryMessageProps = {
  messageId: string;
  threadId: string;
};

export const retrySchema = v.object({
  model: v.string(),
  messageId: v.string(),
});

export function RetryMessage({ messageId, threadId }: RetryMessageProps) {
  const currentModel = useModelOfMessage(messageId);
  const retryMessage = useRetryMessage();

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
                onClick={() => {
                  // Implement regenerate functionality
                  toast.info("Regenerating response...");
                }}
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
            Same model ({MODELS[currentModel]?.name})
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>With new model</DropdownMenuLabel>
          <DropdownMenuGroup>
            {MODEL_IDS.map((modelId) => (
              <DropdownMenuItem
                key={modelId}
                onSelect={() => retryMessage(messageId, threadId, modelId)}
              >
                <span className="flex items-center gap-2">
                  <ModelIcon model={modelId} />
                  <span>{MODELS[modelId]?.name}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
