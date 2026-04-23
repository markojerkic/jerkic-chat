import { createContext, useContext, useEffect } from "react";
import useWebSocket from "react-use-websocket";
import type { SavedMessage, SavedMessageSegment } from "~/db/session/schema";
import {
  useAddMessage,
  useAppendSegmentChunk,
  useMarkStreamingAsDone,
} from "~/store/message";

export type WsMessage =
  | {
      type: "segment-delta";
      messageId: string;
      model: string;
      delta: string;
      segment: Pick<SavedMessageSegment, "id" | "order" | "type">;
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
  const shouldConnect = typeof window !== "undefined";
  const { lastJsonMessage, sendJsonMessage } = useWebSocket<WsMessage>(
    shouldConnect ? `/thread/${threadId}/ws` : null,
    {
      shouldReconnect: () => true,
    },
    shouldConnect,
  );
  const appendSegmentChunk = useAppendSegmentChunk();
  const markStreamingAsDone = useMarkStreamingAsDone();
  const addMessage = useAddMessage();

  useEffect(() => {
    switch (lastJsonMessage?.type) {
      case "segment-delta":
        appendSegmentChunk({
          messageId: lastJsonMessage.messageId,
          segmentId: lastJsonMessage.segment.id,
          segmentOrder: lastJsonMessage.segment.order,
          segmentType: lastJsonMessage.segment.type,
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
  }, [addMessage, appendSegmentChunk, lastJsonMessage, markStreamingAsDone]);

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
