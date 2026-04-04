export function usePrefetch(_threadId: string) {
  const prefetch = () => {
    // TODO: trigger TanStack Router preload for /thread/$threadId
    // fetcher.load(`/thread/${threadId}`);
  };

  return {
    prefetch,
    isLoading: false,
  };
}
