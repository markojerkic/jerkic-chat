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

      addLiveMessage: (message) => {
        set((state) => {
          state.liveMessages[message.id] = message;
          console.log(
            "Added live message:",
            message.id,
            message.textContent?.slice(0, 50),
          );
        });
      },

      updateLiveMessageText: (id, content) => {
        set((state) => {
          if (state.liveMessages[id]) {
            state.liveMessages[id].textContent = content;
            console.log("Updated live message:", id, content.slice(0, 50));
          }
        });
      },

      appendLiveMessageText: (threadId, id, content) => {
        set((state) => {
          const message = state.liveMessages[id];
          if (message) {
            message.textContent = (message.textContent || "") + content;
            console.log(
              "Appended to live message:",
              id,
              "total length:",
              message.textContent.length,
            );
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

// Simplified functions
export function addNewMessage(message: Message) {
  console.log("Adding new message:", message);
  useLiveMessages.getState().addLiveMessage(message);
}

export function addStubMessage(threadId: string, messageId: string) {
  console.log("Adding stub message:", messageId);
  const stub: Message = {
    id: messageId,
    thread: threadId,
    sender: "llm",
    textContent: null,
  };
  useLiveMessages.getState().addLiveMessage(stub);
}

export function appendToMessage(messageId: string, content: string) {
  useLiveMessages.getState().appendLiveMessageText(messageId, content);
}
