import { useEffect } from "react";
// TODO: replace useFetcher with a TanStack server fn / loader call when /thread/:id is migrated
// import { useFetcher } from "react-router";
import { useShallow } from "zustand/react/shallow";
import {
  useLiveMessages,
  useMessageIdsForThread,
} from "~/store/messages-store";

export function usePrefetch(threadId: string) {
  // TODO: restore prefetch logic via TanStack Router's loader / preload mechanism
  // const fetcher = useFetcher<Route.ComponentProps["loaderData"]>();
  const currentData = useMessageIdsForThread(threadId);
  const addMessages = useLiveMessages(useShallow((store) => store.addMessages));
  const setThreadName = useLiveMessages(
    useShallow((store) => store.setThreadName),
  );

  useEffect(() => {
    // TODO: re-enable when fetcher/loader data is available
    // if (fetcher.data) {
    //   addMessages(fetcher.data.messages);
    //   setThreadName(threadId, fetcher.data.threadTitle ?? "New thread");
    // }
  }, [addMessages, setThreadName, threadId]);

  const prefetch = () => {
    if (currentData.length > 0) {
      return;
    }
    // TODO: trigger TanStack Router preload for /thread/$threadId
    // fetcher.load(`/thread/${threadId}`);
  };

  return {
    prefetch,
    isLoading: false,
  };
}
