import { getRouteApi } from "@tanstack/react-router";
import type { WritableDraft } from "immer";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { SavedMessage } from "~/db/session/schema";

export type ChatStore = {
  messages: Record<string, SavedMessage>;
  messageIds: string[];
  addMessageWithResponse: (message: SavedMessage, llmMessageId: string) => void;
  clear: () => void;
  markStreamingAsDone: () => void;
  addMessage: (message: SavedMessage) => void;
  addMessages: (messages: SavedMessage[]) => void;
  appendTextChunk: (data: {
    messageId: string;
    chunk: string;
    state?: SavedMessage["status"];
    model?: string;
  }) => void;
};

export const createChatStore = () =>
  createStore<ChatStore, [["zustand/immer", never]]>(
    immer((set) => ({
      messages: {},
      messageIds: [],
      markStreamingAsDone() {
        set((state) => {
          for (const messageId of state.messageIds) {
            if (state.messages[messageId]?.status === "streaming") {
              state.messages[messageId].status = "done";
            }
          }
          return state;
        });
      },
      clear() {
        set((state) => {
          state.messageIds = [];
          state.messages = {};
          return state;
        });
      },
      addMessageWithResponse(message, llmMessageId) {
        set((state) => {
          upsertMessage(state, message);
          upsertMessage(state, {
            id: llmMessageId,
            createdAt: new Date(),
            status: "streaming",
            textContent: null,
            model: message.model,
            sender: "llm",
            order: 1,
            messageAttachemts: [],
          });
          rebuildMessageIds(state);
        });
      },
      addMessage(message) {
        set((state) => {
          upsertMessage(state, message);
          rebuildMessageIds(state);
        });
      },
      addMessages(messages) {
        set((state) => {
          state.messages = {};
          for (const message of messages) {
            upsertMessage(state, message);
          }

          rebuildMessageIds(state);
        });
      },
      appendTextChunk(data) {
        set((state) => {
          if (!state.messages[data.messageId]) {
            upsertMessage(state, {
              id: data.messageId,
              model: data.model ?? "",
              textContent: data.chunk ?? "",
              sender: "llm",
              createdAt: new Date(),
              status: "streaming",
              order: 1,
              messageAttachemts: [],
            });
            rebuildMessageIds(state);
            return;
          }

          if (state.messages[data.messageId].textContent) {
            state.messages[data.messageId].textContent += data.chunk;
          } else {
            state.messages[data.messageId].textContent = data.chunk;
          }
          if (data.state) {
            state.messages[data.messageId].status = data.state;
          }
          if (data.model && !state.messages[data.messageId].model) {
            state.messages[data.messageId].model = data.model;
          }
        });
      },
    })),
  );

export const ChatContext = createContext<
  ReturnType<typeof createChatStore> | undefined
>(undefined);

export const useChatStore = <T>(selector: (store: ChatStore) => T) => {
  const chatStoreContext = useContext(ChatContext);
  if (!chatStoreContext) {
    throw Error("ChatContext not defined for useChatStore");
  }
  return useStore(chatStoreContext, selector);
};

export const useClear = () => {
  return useChatStore(useShallow((state) => state.clear));
};

export const useMessage = (id: string) => {
  return useChatStore(useShallow((state) => state.messages[id]));
};

export const useThreadMessages = () => {
  return useChatStore(useShallow((state) => state.messageIds));
};

export const useAppendTextChunk = () => {
  return useChatStore(useShallow((state) => state.appendTextChunk));
};

export const useAddMessage = () => {
  return useChatStore(useShallow((state) => state.addMessage));
};

export const useAddMessageWithResponse = () => {
  return useChatStore(useShallow((state) => state.addMessageWithResponse));
};

export const useHasLiveMessages = () => {
  return useChatStore(useShallow((state) => state.messageIds.length > 0));
};

const threadRoute = getRouteApi("/_authenticated/thread/$threadId");

export const useModelOfMessage = (messageId: string) => {
  const messages = threadRoute.useLoaderData();
  const liveModel = useChatStore(
    useShallow((state) => state.messages[messageId]?.model),
  );

  return liveModel ?? messages.messages.find((m) => m.id === messageId)?.model;
};

export const useThreadIsStreaming = () => {
  return useChatStore(
    useShallow((state) => {
      if (state.messageIds.length <= 1) {
        return false;
      }

      return Object.values(state.messages).some(
        (message) => message.status === "streaming",
      );
      // return (
      //   state.messages[state.messageIds.length - 1]?.status === "streaming"
      // );
    }),
  );
};

export const useMarkStreamingAsDone = () => {
  return useChatStore(useShallow((state) => state.markStreamingAsDone));
};

function upsertMessage(state: WritableDraft<ChatStore>, message: SavedMessage) {
  state.messages[message.id] = message;
}

function toTimestamp(createdAt: SavedMessage["createdAt"]) {
  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  const timestamp = new Date(createdAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function toOrder(order: SavedMessage["order"]) {
  return order ?? Number.MIN_SAFE_INTEGER;
}

function compareMessages(a: SavedMessage, b: SavedMessage) {
  const createdAtDelta = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  const orderDelta = toOrder(a.order) - toOrder(b.order);
  if (orderDelta !== 0) {
    return orderDelta;
  }

  return a.id.localeCompare(b.id);
}

function rebuildMessageIds(state: WritableDraft<ChatStore>) {
  state.messageIds = Object.values(state.messages)
    .sort(compareMessages)
    .map((message) => message.id);
}
