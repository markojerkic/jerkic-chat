import { useEffect } from "react";
import useWebSocket from "react-use-websocket";

export function MessagesProvider() {
  const { readyState, lastMessage, lastJsonMessage } = useWebSocket("/ws");

  useEffect(() => {}, [readyState, lastMessage]);

  return (
    <pre className="text-black fixed bg-white p-2 top-0 left-0 right-0">
      Last message: {JSON.stringify(lastJsonMessage, null, 2)}
    </pre>
  );
}
