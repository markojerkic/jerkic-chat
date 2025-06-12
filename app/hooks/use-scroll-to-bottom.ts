import { useCallback, useEffect, useRef, useState } from "react";

type ScrollToBottomOptions = {
  threshold?: number;
  autoScrollOnNewContent?: boolean;
};

export function useScrollToBottom<T extends HTMLElement = HTMLDivElement>({
  threshold,
  autoScrollOnNewContent,
}: ScrollToBottomOptions) {
  const containerRef = useRef<T>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom =
      scrollHeight - scrollTop - clientHeight < (threshold ?? 90);
    setIsNearBottom(atBottom);
    setShowScrollButton(!atBottom);
  }, [threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScrollPosition);
    // Also check on resize as content dimensions might change
    window.addEventListener("resize", checkScrollPosition);

    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
    };
  }, [checkScrollPosition]);

  // Function to call when content changes
  const onContentChange = useCallback(() => {
    checkScrollPosition();
    if (autoScrollOnNewContent && isNearBottom) {
      scrollToBottom();
    }
  }, [
    autoScrollOnNewContent,
    checkScrollPosition,
    isNearBottom,
    scrollToBottom,
  ]);

  return {
    containerRef,
    scrollToBottom,
    showScrollButton,
    isNearBottom,
    checkScrollPosition,
    onContentChange,
  };
}
