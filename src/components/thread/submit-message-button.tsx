import { ArrowUp } from "lucide-react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { useThreadIsStreaming } from "~/store/messages-store";
import { Button } from "../ui/button";
import type { ChatMessage } from "./thread";

export function SubmitMessageButton({ threadId }: { threadId: string }) {
  const form = useFormContext<ChatMessage>();
  const state = useFormState();
  const isStreaming = useThreadIsStreaming(threadId);
  const q = useWatch<ChatMessage>({
    defaultValue: form.getValues("q"),
    name: "q",
  }) as string | undefined;

  return (
    <Button
      type="submit"
      disabled={!state.isValid || isStreaming}
      className="border-reflect button-reflect focus-visible:ring-ring dark:bg-primary/20 disabled:dark:hover:bg-primary/20 disabled:dark:active:bg-primary/20 relative inline-flex h-9 w-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[rgb(162,59,103)] p-2 text-sm font-semibold text-pink-50 shadow transition-colors hover:bg-[#d56698] focus-visible:outline-none focus-visible:ring-1 active:bg-[rgb(162,59,103)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[rgb(162,59,103)] disabled:active:bg-[rgb(162,59,103)] dark:hover:bg-pink-800/70 dark:active:bg-pink-800/40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
      aria-label={!q?.trim() ? "Message requires text" : "Send message"}
    >
      <ArrowUp className="!size-5 stroke-pink-50" />
    </Button>
  );
}
