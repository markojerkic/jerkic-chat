import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type UseThreadScrollParams = {
  threadId: string;
  historyLength: number;
};

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useThreadScroll({
  threadId,
  historyLength,
}: UseThreadScrollParams) {
  const scrollContainer = useRef<HTMLDivElement | null>(null);
  const messagesContent = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerId = `thread-scroll-${threadId}`;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const ref = scrollContainer.current;
    if (!ref) {
      return;
    }

    ref.scrollTop = ref.scrollHeight;
    ref.scrollTo({
      top: ref.scrollHeight,
      behavior,
    });
  }, []);

  const updateScrollButton = useCallback(() => {
    const ref = scrollContainer.current;
    if (!ref) {
      return;
    }

    const distanceFromBottom =
      ref.scrollHeight - ref.scrollTop - ref.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= 120;
    setShowScrollButton(distanceFromBottom > 120);
  }, []);

  useIsomorphicLayoutEffect(() => {
    scrollToBottom("auto");

    let nestedRafId: number | undefined;
    const rafId = requestAnimationFrame(() => {
      scrollToBottom("auto");

      nestedRafId = requestAnimationFrame(() => {
        scrollToBottom("auto");
        updateScrollButton();
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (nestedRafId) {
        cancelAnimationFrame(nestedRafId);
      }
    };
  }, [historyLength, scrollToBottom, threadId, updateScrollButton]);

  useEffect(() => {
    const ref = scrollContainer.current;
    if (!ref) {
      return;
    }

    updateScrollButton();
    ref.addEventListener("scroll", updateScrollButton);

    return () => {
      ref.removeEventListener("scroll", updateScrollButton);
    };
  }, [updateScrollButton]);

  useEffect(() => {
    updateScrollButton();
  }, [historyLength, updateScrollButton]);

  useEffect(() => {
    const content = messagesContent.current;
    if (!content || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        scrollToBottom("auto");
      }

      updateScrollButton();
    });

    observer.observe(content);

    return () => {
      observer.disconnect();
    };
  }, [scrollToBottom, threadId, updateScrollButton]);

  return {
    messagesContent,
    scrollContainer,
    scrollContainerId,
    scrollToBottom,
    showScrollButton,
  };
}
