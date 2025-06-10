import { useEffect } from "react";
import useWebSocket from "react-use-websocket";
import { useLiveMessages } from "~/store/messages-store";

type WsMessage = {
  id: string;
  type: "text-delta";
  delta: string;
  threadId: string;
};

export function useWebSocketMessages() {
  const { readyState, lastMessage, lastJsonMessage } =
    useWebSocket<WsMessage>("/ws");
  const appendTextOfMessage = useLiveMessages(
    (state) => state.appendLiveMessageText,
  );

  useEffect(() => {
    if (lastJsonMessage?.type !== "text-delta") {
      return;
    }
    appendTextOfMessage(
      lastJsonMessage.threadId,
      lastJsonMessage.id,
      lastJsonMessage.delta,
    );
  }, [readyState, lastMessage]);
}
