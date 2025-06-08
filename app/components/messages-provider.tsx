import { useEffect } from "react";
import useWebSocket from "react-use-websocket";

export function MessagesProvider() {
  const { readyState, lastMessage } = useWebSocket("/ws");

  useEffect(() => {}, [readyState, lastMessage]);

  return <pre>Last message: {JSON.stringify(lastMessage, null, 2)}</pre>;
}
