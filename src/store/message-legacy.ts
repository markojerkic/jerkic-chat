import { getRouteApi } from "@tanstack/react-router";
import type { WritableDraft } from "immer";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { SavedMessage } from "~/db/session/schema";

/** @deprecated Legacy message store API. */
export type ChatStore = {
  messages: Record<string, SavedMessage>;
  messageIds: string[];
  /** @deprecated Legacy message store API. */
  addMessageWithResponse: (message: SavedMessage, llmMessageId: string) => void;
  /** @deprecated Legacy message store API. */
  clear: () => void;
  /** @deprecated Legacy message store API. */
  markStreamingAsDone: () => void;
  /** @deprecated Legacy message store API. */
  addMessage: (message: SavedMessage) => void;
  /** @deprecated Legacy message store API. */
  addMessages: (messages: SavedMessage[]) => void;
  /** @deprecated Legacy message store API. */
  appendTextChunk: (data: {
    messageId: string;
    chunk: string;
    state?: SavedMessage["status"];
    model?: string;
  }) => void;
};

/** @deprecated Legacy message store API. */
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

/** @deprecated Legacy message store API. */
export const ChatContext = createContext<
  ReturnType<typeof createChatStore> | undefined
>(undefined);

/** @deprecated Legacy message store API. */
export const useChatStore = <T>(selector: (store: ChatStore) => T) => {
  const chatStoreContext = useContext(ChatContext);
  if (!chatStoreContext) {
    return null;
  }
  return useStore(chatStoreContext, selector);
};

/** @deprecated Legacy message store API. */
export const useClear = () => {
  return useChatStore(useShallow((state) => state.clear));
};

/** @deprecated Legacy message store API. */
export const useMessage = (id: string) => {
  return useChatStore(useShallow((state) => state.messages[id]));
};

/** @deprecated Legacy message store API. */
export const useThreadMessages = () => {
  return useChatStore(useShallow((state) => state.messageIds));
};

/** @deprecated Legacy message store API. */
export const useAppendTextChunk = () => {
  return useChatStore(useShallow((state) => state.appendTextChunk));
};

/** @deprecated Legacy message store API. */
export const useAddMessage = () => {
  return useChatStore(useShallow((state) => state.addMessage));
};

/** @deprecated Legacy message store API. */
export const useAddMessageWithResponse = () => {
  return useChatStore(useShallow((state) => state.addMessageWithResponse));
};

/** @deprecated Legacy message store API. */
export const useHasLiveMessages = () => {
  return useChatStore(useShallow((state) => state.messageIds.length > 0));
};

/** @deprecated Legacy message store API. */
const threadRoute = getRouteApi("/_authenticated/thread/$threadId");

/** @deprecated Legacy message store API. */
export const useModelOfMessage = (messageId: string) => {
  const messages = threadRoute.useLoaderData();
  const liveModel = useChatStore(
    useShallow((state) => state.messages[messageId]?.model),
  );

  return liveModel ?? messages.messages.find((m) => m.id === messageId)?.model;
};

/** @deprecated Legacy message store API. */
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

/** @deprecated Legacy message store API. */
export const useMarkStreamingAsDone = () => {
  return useChatStore(useShallow((state) => state.markStreamingAsDone));
};

/** @deprecated Legacy message store API. */
function upsertMessage(state: WritableDraft<ChatStore>, message: SavedMessage) {
  state.messages[message.id] = message;
}

/** @deprecated Legacy message store API. */
function toTimestamp(createdAt: SavedMessage["createdAt"]) {
  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  const timestamp = new Date(createdAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/** @deprecated Legacy message store API. */
function toOrder(order: SavedMessage["order"]) {
  return order ?? Number.MIN_SAFE_INTEGER;
}

/** @deprecated Legacy message store API. */
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

/** @deprecated Legacy message store API. */
function rebuildMessageIds(state: WritableDraft<ChatStore>) {
  state.messageIds = Object.values(state.messages)
    .sort(compareMessages)
    .map((message) => message.id);
}
