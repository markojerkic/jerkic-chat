import { ChatInput } from "./chat-input";
import type { ChatMessage } from "./thread";

type ThreadComposerProps = {
  defaultModel: string;
  isSubmitting: boolean;
  onSubmit: (data: ChatMessage) => void;
  threadId: string;
};

export function ThreadComposer({
  defaultModel,
  isSubmitting,
  onSubmit,
  threadId,
}: ThreadComposerProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4">
      <div className="pointer-events-auto mx-auto w-full max-w-3xl">
        <ChatInput
          threadId={threadId}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          defaultModel={defaultModel}
        />
      </div>
    </div>
  );
}
