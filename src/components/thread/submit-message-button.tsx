import { ArrowUp, Square } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { useHotkeys } from "react-hotkeys-hook";
import { ChatContext } from "~/store/chat";
import { Button } from "../ui/button";
import type { ChatMessage } from "./chat-input";

export const SubmitMessageButton = observer(function SubmitMessageButton() {
  const chatStore = useContext(ChatContext);
  const form = useFormContext<ChatMessage>();
  const state = useFormState();
  const isStreaming = chatStore.state === "streaming";

  const q = useWatch<ChatMessage>({
    defaultValue: form.getValues("q"),
    name: "q",
  }) as string | undefined;
  useHotkeys(
    "esc",
    () => {
      chatStore.stopMessageStream();
    },
    {
      enabled: isStreaming,
      enableOnFormTags: true,
    },
  );

  if (isStreaming) {
    return (
      <Button
        type="button"
        onClick={() => chatStore.stopMessageStream()}
        className="border-reflect button-reflect focus-visible:ring-ring relative inline-flex h-9 w-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#f3d2e1] p-2 text-sm font-semibold text-[rgb(145,53,93)] shadow transition-colors hover:bg-[#e9b8d1] focus-visible:outline-none focus-visible:ring-1 active:bg-[#dca0bf] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#f3d2e1] disabled:active:bg-[#f3d2e1] dark:bg-pink-200 dark:text-pink-800 dark:hover:bg-pink-300 dark:active:bg-pink-400 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
        aria-label="Stop answer"
      >
        <Square className="size-5! fill-current stroke-current" />
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      disabled={!state.isValid || isStreaming}
      className="border-reflect button-reflect focus-visible:ring-ring dark:bg-primary/20 disabled:dark:hover:bg-primary/20 disabled:dark:active:bg-primary/20 relative inline-flex h-9 w-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[rgb(162,59,103)] p-2 text-sm font-semibold text-pink-50 shadow transition-colors hover:bg-[#d56698] focus-visible:outline-none focus-visible:ring-1 active:bg-[rgb(162,59,103)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[rgb(162,59,103)] disabled:active:bg-[rgb(162,59,103)] dark:hover:bg-pink-800/70 dark:active:bg-pink-800/40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
      aria-label={!q?.trim() ? "Message requires text" : "Send message"}
    >
      <ArrowUp className="size-5! stroke-pink-50" />
    </Button>
  );
});
