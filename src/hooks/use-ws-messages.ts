import { createContext, useContext, useEffect } from "react";
import useWebSocket from "react-use-websocket";
import type { SavedMessage } from "~/db/session/schema";
import {
  useAddMessage,
  useAppendTextChunk,
  useMarkStreamingAsDone,
} from "~/store/message";

export type WsMessage =
  | {
      id: string;
      type: "text-delta";
      model: string;
      delta: string;
    }
  | ({
      type: "last-chunk";
    } & SavedMessage)
  | ({
      type: "message-finished";
    } & SavedMessage)
  | {
      id: string;
      type: "error";
    }
  | { type: "streaming-done" };
export type ClientWsMessage = "stop";

export function useWebSocketMessages(threadId: string) {
  const { readyState, lastMessage, lastJsonMessage, sendJsonMessage } =
    useWebSocket<WsMessage>(`/thread/${threadId}/ws`, {
      shouldReconnect: () => true,
    });
  const appendTextOfMessage = useAppendTextChunk();
  const markStreamingAsDone = useMarkStreamingAsDone();
  const addMessage = useAddMessage();

  useEffect(() => {
    switch (lastJsonMessage?.type) {
      case "text-delta":
        appendTextOfMessage({
          messageId: lastJsonMessage.id,
          chunk: lastJsonMessage.delta,
          model: lastJsonMessage.model,
          state: "streaming",
        });
        break;
      case "message-finished":
      case "last-chunk":
        addMessage(lastJsonMessage);
        break;
      case "streaming-done":
        markStreamingAsDone();
    }
  }, [readyState, lastMessage]);

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
