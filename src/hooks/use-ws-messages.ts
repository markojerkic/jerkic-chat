import { useEffect } from "react";
import useWebSocket from "react-use-websocket";
import type { SavedMessage } from "~/db/session/schema";
import { useAddMessage, useAppendTextChunk } from "~/store/message";

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
      type: "last-chunk";
      model: string;
      delta: string;
      threadId: string;
    }
  | ({
      type: "message-finished";
    } & SavedMessage)
  | {
      id: string;
      type: "error";
      threadId: string;
    };

export function useWebSocketMessages(threadId: string) {
  const { readyState, lastMessage, lastJsonMessage, sendJsonMessage } =
    useWebSocket<WsMessage>(`/thread/${threadId}/ws`, {
      shouldReconnect: () => true,
    });
  const appendTextOfMessage = useAppendTextChunk();
  const addMessage = useAddMessage();

  useEffect(() => {
    console.log("chunk", lastJsonMessage);
    switch (lastJsonMessage?.type) {
      case "last-chunk":
        console.log("last chunk");
        appendTextOfMessage({
          messageId: lastJsonMessage.id,
          chunk: lastJsonMessage.delta,
          model: lastJsonMessage.model,
          state: "done",
        });

        break;
      case "text-delta":
        appendTextOfMessage({
          messageId: lastJsonMessage.id,
          chunk: lastJsonMessage.delta,
        });
        break;
      case "message-finished":
        addMessage(lastJsonMessage);
    }
  }, [readyState, lastMessage]);
}
