import type { WritableDraft } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { SavedMessage } from "~/database/schema";

type ChatStore = {
  messages: Record<string, SavedMessage>;
  messageIds: Record<string, string[]>;
  addMessage: (message: SavedMessage) => void;
  addMessages: (threadId: string, messages: SavedMessage[]) => void;
};

function addMessage(state: WritableDraft<ChatStore>, message: SavedMessage) {
  state.messages[message.id] = message;
  const ids = state.messageIds[message.thread];
  ids.push(message.id);
  state.messageIds[message.thread] = ids;
}

export const useChatStore = create<ChatStore, [["zustand/immer", never]]>(
  immer((set) => ({
    messages: {},
    messageIds: {},
    addMessage(message) {
      set((state) => {
        state.messageIds[message.thread] = [];
        return addMessage(state, message);
      });
    },
    addMessages(threadId, messages) {
      set((state) => {
        if (state.messageIds[threadId]) {
          return;
        }
        state.messageIds[threadId] = [];
        for (const message of messages) {
          addMessage(state, message);
        }
      });
    },
  })),
);

export const useMessage = (id: string) => {
  return useChatStore(useShallow((state) => state.messages[id]));
};

export const useThreadMessages = (threadId: string) => {
  return useChatStore(useShallow((state) => state.messageIds[threadId] ?? []));
};
