import { useMutation } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RotateCw } from "lucide-react";
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
import { retryMessage } from "~/server/llm.functions";
import { ChatContext } from "~/store/chat";
import { ModelIcon } from "../thread/model-selector";

type RetryMessageProps = {
  messageId: string;
};

export const RetryMessage = observer(function RetryMessage({
  messageId,
}: RetryMessageProps) {
  const chatStore = useContext(ChatContext);
  const { threadId } = useParams({ strict: false });
  const currentModelId = chatStore.model;
  const models = useModels();
  const currentModel = useModel(currentModelId ?? "");
  const retryMessageFn = useServerFn(retryMessage);

  const mutation = useMutation({
    mutationKey: ["retry-message", messageId],
    mutationFn: retryMessageFn,
    onMutate: ({ data }) => {
      chatStore.retryMessage(messageId, data.model);
    },
    onError: (err) => {
      console.error("failed retry", err);
    },
  });

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
            onSelect={() =>
              mutation.mutate({
                data: {
                  messageId,
                  model: currentModel.slug,
                  threadId: threadId!,
                },
              })
            }
          >
            Same model ({currentModel?.short_name})
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>With new model</DropdownMenuLabel>
          <DropdownMenuGroup>
            {models.map((model) => (
              <DropdownMenuItem
                key={model.slug}
                onSelect={() =>
                  mutation.mutate({
                    data: {
                      messageId,
                      model: model.slug,
                      threadId: threadId!,
                    },
                  })
                }
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
