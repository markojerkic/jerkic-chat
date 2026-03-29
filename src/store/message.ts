import type { WritableDraft } from "immer";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { SavedMessage } from "~/db/session/schema";

export type ChatStore = {
  messages: Record<string, SavedMessage>;
  messageIds: string[];
  addMessage: (message: SavedMessage) => void;
  addMessages: (messages: SavedMessage[]) => void;
  appendTextChunk: (data: {
    messageId: string;
    chunk: string;
    state?: string;
    model?: string;
  }) => void;
};

function addMessage(state: WritableDraft<ChatStore>, message: SavedMessage) {
  state.messages[message.id] = message;
  state.messageIds.push(message.id);
}

export const createChatStore = () =>
  createStore<ChatStore, [["zustand/immer", never]]>(
    immer((set) => ({
      messages: {},
      messageIds: [],
      addMessage(message) {
        set((state) => {
          state.messageIds = [];
          return addMessage(state, message);
        });
      },
      addMessages(messages) {
        set((state) => {
          state.messageIds = [];
          for (const message of messages) {
            addMessage(state, message);
          }
          return state;
        });
      },
      appendTextChunk(data) {
        set((state) => {
          if (!state.messages[data.messageId]) {
            return addMessage(state, {
              id: data.messageId,
              model: data.model ?? "",
              textContent: data.chunk,
              sender: "llm",
              createdAt: new Date(),
              status: "streaming",
              order: 1,
              messageAttachemts: [],
            });
          }

          state.messages[data.messageId].textContent += data.chunk;
          if (data.state && !state.messages[data.messageId].status) {
            // @ts-expect-error
            state.messages[data.messageId].status = data.state;
          }
          if (data.model && !state.messages[data.messageId].model) {
            state.messages[data.messageId].model = data.model;
          }
          return state;
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
