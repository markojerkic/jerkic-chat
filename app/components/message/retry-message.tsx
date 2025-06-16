import { valibotResolver } from "@hookform/resolvers/valibot";
import { RotateCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as v from "valibot";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { MODEL_IDS } from "~/models/models";
import { useModelOfMessage } from "~/store/messages-store";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type RetryMessageProps = {
  messageId: string;
  threadId: string;
};

export const retrySchema = v.object({
  model: v.string(),
  messageId: v.string(),
});

export function RetryMessage({ messageId, threadId }: RetryMessageProps) {
  const model = useModelOfMessage(messageId);

  const form = useForm({
    resolver: valibotResolver(retrySchema),
    defaultValues: {
      messageId: messageId,
    },
  });

  if (!model) {
    return null;
  }

  return (
    <TooltipProvider>
      <Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger asChild>
              <button
                className="rounded p-1 transition-colors hover:bg-gray-100"
                onClick={() => {
                  // Implement regenerate functionality
                  toast.info("Regenerating response...");
                }}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent>Regenerate response</TooltipContent>
        </Tooltip>

        <SelectContent>
          <SelectGroup>
            <SelectItem currentModel={model}>Same model ({model})</SelectItem>
          </SelectGroup>
          <SelectGroup>
            {MODEL_IDS.map((modelId: string) => (
              <SelectItem
                value={modelId}
                key={modelId}
                onSelect={() => {
                  form.setValue("model", modelId);
                }}
              >
                <SelectValue>{modelId}</SelectValue>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
}
