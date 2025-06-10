import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";

export type Message = {
  thread: string;
  id: string;
  sender: "user" | "llm";
  textContent: string | null;
};

// Only store LIVE messages (new ones being sent/received)
type LiveMessagesState = {
  liveMessages: Record<string, Message>; // keyed by message ID
  addMessages: (message: Message[]) => void;
  addLiveMessage: (message: Message) => void;
  updateLiveMessageText: (id: string, content: string) => void;
  appendLiveMessageText: (
    threadId: string,
    id: string,
    content: string,
  ) => void;
  getLiveMessagesForThread: (threadId: string) => Message[];
  clearLiveMessages: () => void;
};

export const useLiveMessages = create<LiveMessagesState>()(
  devtools(
    immer((set, get) => ({
      liveMessages: {},

      addMessages: (messages) => {
        set((state) => {
          for (const message of messages) {
            state.liveMessages[message.id] = message;
          }
        });
      },

      addLiveMessage: (message) => {
        set((state) => {
          state.liveMessages[message.id] = message;
        });
      },

      updateLiveMessageText: (id, content) => {
        set((state) => {
          if (state.liveMessages[id]) {
            state.liveMessages[id].textContent = content;
          }
        });
      },

      appendLiveMessageText: (threadId, id, content) => {
        set((state) => {
          const message = state.liveMessages[id];
          if (message) {
            message.textContent = (message.textContent || "") + content;
          } else {
            console.warn("Live message not found for append:", id);

            state.liveMessages[id] = {
              id,
              thread: threadId,
              textContent: content,
              sender: "llm",
            };
          }
        });
      },

      getLiveMessagesForThread: (threadId) => {
        const state = get();
        return Object.values(state.liveMessages).filter(
          (msg) => msg.thread === threadId,
        );
      },

      clearLiveMessages: () => {
        set((state) => {
          state.liveMessages = {};
        });
      },
    })),
  ),
);

// Simple hooks
export const useLiveMessage = (id: string) => {
  return useLiveMessages(useShallow((state) => state.liveMessages[id]));
};

export const useLiveMessagesForThread = (threadId: string) => {
  return useLiveMessages(
    useShallow((state) =>
      Object.values(state.liveMessages).filter(
        (msg) => msg.thread === threadId,
      ),
    ),
  );
};
