import { ChatInput } from "./chat-input";
import {
  ScrollToBottomButton,
  type ScrollToBottomButtonProps,
} from "./scroll-to-bottom-button";

type ThreadComposerProps = {
  defaultModel: string | undefined;
  threadId: string;
} & ScrollToBottomButtonProps;

export function ThreadComposer({
  defaultModel,
  threadId,
  showScrollButton,
  onScrollToBottom,
}: ThreadComposerProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4">
      <ScrollToBottomButton
        showScrollButton={showScrollButton}
        onScrollToBottom={onScrollToBottom}
      />

      <div className="pointer-events-auto mx-auto w-full max-w-3xl">
        <ChatInput threadId={threadId} defaultModel={defaultModel} />
      </div>
    </div>
  );
}
