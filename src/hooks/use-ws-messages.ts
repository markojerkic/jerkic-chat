import { createContext, useContext, useEffect } from "react";
import useWebSocket from "react-use-websocket";
import type { SavedMessage } from "~/db/session/schema";
import { ChatContext } from "~/store/chat";

export type WsMessage =
  | {
      id: string;
      type: "text";
      delta: string;
    }
  | {
      id: string;
      type: "reasoning";
      delta: string;
    }
  | ({
      type: "message-finished";
    } & SavedMessage)
  | {
      id: string;
      type: "error";
    }
  | { type: "streaming-done" }
  | { type: "tool-call"; tool: string };
export type ClientWsMessage = "stop";

export function useWebSocketMessages(threadId: string) {
  const chatStore = useContext(ChatContext);
  const shouldConnect = typeof window !== "undefined";
  console.log("shouldConnect", shouldConnect);
  const { readyState, lastMessage, lastJsonMessage, sendJsonMessage } =
    useWebSocket<WsMessage>(
      shouldConnect ? `/thread/${threadId}/ws` : null,
      {
        shouldReconnect: () => true,
      },
      shouldConnect,
    );

  useEffect(() => {
    switch (lastJsonMessage?.type) {
      case "text":
        chatStore
          .getMessage(lastJsonMessage.id)
          ?.appendTextOfMessage(lastJsonMessage.delta);
        // appendTextOfMessage({
        //   messageId: lastJsonMessage.id,
        //   chunk: lastJsonMessage.delta,
        //   model: lastJsonMessage.model,
        //   state: "streaming",
        // });
        break;
      case "message-finished":
        chatStore.getMessage(lastJsonMessage.id)?.setValue(lastJsonMessage);
        break;
      case "streaming-done":
        chatStore.markAsDone();
    }
  }, [lastJsonMessage, lastMessage, readyState, chatStore]);

  const stopMessage = () => {
    sendJsonMessage("stop");
  };

  return {
    stopMessage,
  };
}

export const ClientMessageContext = createContext<ReturnType<
  typeof useWebSocketMessages
> | null>(null);

export const useClientMessageContext = () => useContext(ClientMessageContext);
