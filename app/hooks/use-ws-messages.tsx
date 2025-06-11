import { useEffect } from "react";
import useWebSocket from "react-use-websocket";
import { useLiveMessages } from "~/store/messages-store";

type WsMessage =
  | {
      id: string;
      type: "text-delta";
      delta: string;
      threadId: string;
    }
  | {
      id: string;
      type: "message-finished";
      message: string;
      threadId: string;
    };

export function useWebSocketMessages() {
  const { readyState, lastMessage, lastJsonMessage } =
    useWebSocket<WsMessage>("/ws");
  const appendTextOfMessage = useLiveMessages(
    (state) => state.appendLiveMessageText,
  );
  const addMessage = useLiveMessages((state) => state.addLiveMessage);

  useEffect(() => {
    switch (lastJsonMessage?.type) {
      case "text-delta":
        appendTextOfMessage(
          lastJsonMessage.threadId,
          lastJsonMessage.id,
          lastJsonMessage.delta,
        );
        break;
      case "message-finished":
        addMessage({
          id: lastJsonMessage.id,
          thread: lastJsonMessage.threadId,
          sender: "llm",
          textContent: lastJsonMessage.message,
        });
    }
  }, [readyState, lastMessage]);
}
