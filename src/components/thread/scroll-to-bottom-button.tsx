import { ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";

export type ScrollToBottomButtonProps = {
  showScrollButton: boolean;
  onScrollToBottom: () => void;
};

export function ScrollToBottomButton({
  showScrollButton,
  onScrollToBottom,
}: ScrollToBottomButtonProps) {
  if (!showScrollButton) return null;

  return (
    <div className="pointer-events-none inset-x-0 z-10 flex justify-center p-4">
      <Button
        onClick={onScrollToBottom}
        variant="secondary"
        size="sm"
        className="border-secondary/40 text-secondary-foreground/70 hover:bg-secondary pointer-events-auto flex items-center gap-2 rounded-full border bg-pink-100/85 backdrop-blur-lg"
      >
        <span className="text-xs font-light">Scroll to bottom</span>
        <ChevronDown className="h-4 w-4 stroke-1 font-light" />
      </Button>
    </div>
  );
}
