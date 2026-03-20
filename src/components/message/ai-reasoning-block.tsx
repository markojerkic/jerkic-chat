import { Brain, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type AIReasoningBlockProps = {
  children: ReactNode;
};

export function AIReasoningBlock({ children }: AIReasoningBlockProps) {
  return (
    <details className="border-secondary/50 bg-secondary/20 group my-4 rounded-lg border">
      <summary className="hover:bg-secondary/30 flex cursor-pointer list-none items-center justify-between p-3 text-left">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <Brain className="h-4 w-4" />
          AI Reasoning
        </div>
        <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="text-muted-foreground px-3 text-sm">
        <div className="py-3">{children}</div>
      </div>
    </details>
  );
}
