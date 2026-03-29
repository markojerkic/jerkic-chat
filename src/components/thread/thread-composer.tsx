import { ChatInput } from "./chat-input";

type ThreadComposerProps = {
  defaultModel: string;
  threadId: string;
};

export function ThreadComposer({
  defaultModel,
  threadId,
}: ThreadComposerProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4">
      <div className="pointer-events-auto mx-auto w-full max-w-3xl">
        <ChatInput threadId={threadId} defaultModel={defaultModel} />
      </div>
    </div>
  );
}
