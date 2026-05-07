import { Skeleton } from "../ui/skeleton";

function LlmMessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="w-full space-y-2 p-3">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function UserMessageSkeleton({ width }: { width: string }) {
  return (
    <div className="flex justify-end">
      <Skeleton
        className={`h-10 rounded-xl ${width}`}
        style={{ maxWidth: "80%" }}
      />
    </div>
  );
}

export function MessagesListSkeleton() {
  return (
    <div className="w-3xl mx-auto flex grow flex-col space-y-3">
      <UserMessageSkeleton width="w-48" />
      <LlmMessageSkeleton />
      <UserMessageSkeleton width="w-64" />
      <LlmMessageSkeleton />
    </div>
  );
}
