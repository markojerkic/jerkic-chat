import { RotateCw } from "lucide-react";
// TODO: replace useFetcher with a TanStack server fn once /retry-message action is migrated
// import { useFetcher } from "react-router";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
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
import { useModel, useModels } from "~/hooks/use-models";
import { ChatContext } from "~/store/chat";
import { ModelIcon } from "../thread/model-selector";

type RetryMessageProps = {
  messageId: string;
};

export const RetryMessage = observer(function RetryMessage({
  messageId,
}: RetryMessageProps) {
  // TODO: replace with TanStack server fn submission when /retry-message is migrated
  // const fetcher = useFetcher();
  const chatStore = useContext(ChatContext);
  const currentModelId = chatStore.model;
  const models = useModels();
  const currentModel = useModel(currentModelId ?? "");
  // const optimisticRetry = useRetryMessage();

  const retryMessage = async (messageId: string, model: string) => {
    // TODO: re-enable server submission via TanStack server fn
    // if (fetcher.state !== "idle") { return; }
    // optimisticRetry(messageId, threadId, model);
    // TODO: submit to server via TanStack server fn
    // fetcher.submit({ messageId, threadId, model }, { method: "POST", action: "/retry-message" });
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
                disabled={!currentModel}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Regenerate response</TooltipContent>
        </Tooltip>

        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => retryMessage(messageId, currentModel.slug)}
          >
            Same model ({currentModel?.short_name})
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>With new model</DropdownMenuLabel>
          <DropdownMenuGroup>
            {models.map((model) => (
              <DropdownMenuItem
                key={model.slug}
                onSelect={() => retryMessage(messageId, model.slug)}
              >
                <span className="flex items-center gap-2">
                  <ModelIcon model={model.slug} />
                  <span>{model.name}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
});
