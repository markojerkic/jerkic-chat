import { useEffect } from "react";
import useWebSocket from "react-use-websocket";
import { useLiveMessages } from "~/store/messages-store";

export type WsMessage =
  | {
      id: string;
      type: "text-delta";
      model: string;
      delta: string;
      threadId: string;
    }
  | {
      id: string;
      model: string;
      type: "message-finished";
      message: string;
      threadId: string;
    }
  | {
      id: string;
      type: "error";
      threadId: string;
    };

export function useWebSocketMessages() {
  const { readyState, lastMessage, lastJsonMessage } = useWebSocket<WsMessage>(
    "/ws",
    {
      shouldReconnect: () => true,
    },
  );
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
          model: lastJsonMessage.model,
          status: "done",
        });
    }
  }, [readyState, lastMessage]);
}
