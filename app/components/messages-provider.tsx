import { useEffect } from "react";
import useWebSocket from "react-use-websocket";
import { useLiveMessages } from "~/store/messages-store";

type WsMessage = {
  id: string;
  type: "text-delta";
  delta: string;
};

export function MessagesProvider() {
  const { readyState, lastMessage, lastJsonMessage } =
    useWebSocket<WsMessage>("/ws");
  const appendTextOfMessage = useLiveMessages(
    (state) => state.appendLiveMessageText
  );

  useEffect(() => {
    if (lastJsonMessage?.type !== "text-delta") {
      return;
    }
    appendTextOfMessage(lastJsonMessage.id, lastJsonMessage.delta);
  }, [readyState, lastMessage]);

  return (
    <pre className="sticky text-black bg-white p-2 top-0 left-0 right-0">
      Last message: {JSON.stringify(lastJsonMessage, null, 2)}
    </pre>
  );
}
