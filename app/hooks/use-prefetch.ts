import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useShallow } from "zustand/react/shallow";
import {
  useLiveMessages,
  useMessageIdsForThread,
} from "~/store/messages-store";
import type { Route } from "../routes/+types/thread";

export function usePrefetch(threadId: string) {
  const fetcher = useFetcher<Route.ComponentProps["loaderData"]>();
  const currentData = useMessageIdsForThread(threadId);
  const addMessages = useLiveMessages(useShallow((store) => store.addMessages));
  const setThreadName = useLiveMessages(
    useShallow((store) => store.setThreadName),
  );

  useEffect(() => {
    if (fetcher.data) {
      addMessages(fetcher.data.messages);
      setThreadName(threadId, fetcher.data.threadTitle ?? "New thread");
    }
  }, [fetcher.data, addMessages, setThreadName, threadId]);

  const prefetch = () => {
    if (currentData.length > 0 || fetcher.state !== "idle") {
      return;
    }

    fetcher.load(`/thread/${threadId}`);
  };

  return {
    prefetch,
    isLoading: fetcher.state !== "idle",
  };
}
