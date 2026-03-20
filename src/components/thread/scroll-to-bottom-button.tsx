import { ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";

type ScrollToBottomButtonProps = {
  showScrollButton: boolean;
  onScrollToBottom: () => void;
};

export function ScrollToBottomButton({
  showScrollButton,
  onScrollToBottom,
}: ScrollToBottomButtonProps) {
  if (!showScrollButton) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center px-4 md:bottom-32">
      <Button
        onClick={onScrollToBottom}
        variant="secondary"
        size="sm"
        className="border-secondary/40 text-secondary-foreground/70 hover:bg-secondary pointer-events-auto flex items-center gap-2 rounded-full border bg-pink-100/85 backdrop-blur-lg"
      >
        <span className="pb-0.5 text-xs font-light">Scroll to bottom</span>
        <ChevronDown className="h-4 w-4 stroke-1 font-light" />
      </Button>
    </div>
  );
}
