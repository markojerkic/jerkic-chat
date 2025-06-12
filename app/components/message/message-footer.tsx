import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { SavedMessage } from "~/database/schema";
import { MODELS, type AvailableModel } from "~/models/models";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function MessageFooter({
  message,
  isHovered,
  text,
}: {
  message: SavedMessage;
  isHovered: boolean;
  text: string;
}) {
  if (message.sender !== "llm" || !isHovered) {
    return null;
  }
  const model = MODELS[message.model as AvailableModel];

  return (
    <div className="text-md mt-2 flex animate-in items-center justify-between pt-2 text-gray-500 duration-200 fade-in">
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
          {model?.icon()}
          <span>{model?.name}</span>
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="rounded p-1 transition-colors hover:bg-gray-100"
              onClick={() => {
                // Implement regenerate functionality
                toast.info("Regenerating response...");
              }}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21.8883 13.5C21.1645 18.3113 17.013 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C16.1006 2 19.6248 4.46819 21.1679 8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M17 8H21.4C21.7314 8 22 7.73137 22 7.4V3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </TooltipTrigger>
          <TooltipContent>Regenerate response</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
