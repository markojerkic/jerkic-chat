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
    <div className="pointer-events-none fixed top-[-40px] right-0 left-0 z-10 flex justify-center">
      <Button
        onClick={onScrollToBottom}
        variant="secondary"
        size="sm"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-secondary/40 bg-pink-100/85 text-secondary-foreground/70 backdrop-blur-lg hover:bg-secondary"
      >
        <span className="pb-0.5 text-xs font-light">Scroll to bottom</span>
        <ChevronDown className="h-4 w-4 stroke-1 font-light" />
      </Button>
    </div>
  );
}
