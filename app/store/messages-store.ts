import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { SavedMessage } from "~/database/schema";

type LiveMessagesState = {
  messagesByThread: Record<string, string[]>;
  messagesById: Record<string, SavedMessage>;
  threadStreamingStatus: Record<string, boolean>;

  // Actions
  addMessages: (messages: SavedMessage[]) => void;
  addLiveMessage: (message: SavedMessage) => void;
  updateLiveMessageText: (id: string, content: string) => void;
  appendLiveMessageText: (
    threadId: string,
    id: string,
    model: string,
    content: string,
    status?: "streaming" | "done" | "error",
  ) => void;
  getLiveMessagesForThread: (threadId: string) => SavedMessage[];
  clearLiveMessages: () => void;
  clearThread: (threadId: string) => void;
};

export const useLiveMessages = create<LiveMessagesState>()(
  immer((set, get) => ({
    messagesByThread: {},
    messagesById: {},
    threadStreamingStatus: {},

    addMessages: (messages) => {
      set((state) => {
        for (const message of messages) {
          state.messagesById[message.id] = message;

          if (!state.messagesByThread[message.thread]) {
            state.messagesByThread[message.thread] = [];
          }

          // Only add if not already present (avoid duplicates)
          if (!state.messagesByThread[message.thread].includes(message.id)) {
            state.messagesByThread[message.thread].push(message.id);
          }

          // Update streaming status
          state.threadStreamingStatus[message.thread] = state.messagesByThread[
            message.thread
          ].some((id) => state.messagesById[id]?.status === "streaming");
        }
      });
    },

    addLiveMessage: (message) => {
      set((state) => {
        // Add to messages index
        state.messagesById[message.id] = message;

        // Add to thread index
        if (!state.messagesByThread[message.thread]) {
          state.messagesByThread[message.thread] = [];
        }
        state.messagesByThread[message.thread].push(message.id);

        // Update streaming status
        state.threadStreamingStatus[message.thread] =
          message.status === "streaming" ||
          state.messagesByThread[message.thread].some(
            (id) => state.messagesById[id]?.status === "streaming",
          );
      });
    },

    updateLiveMessageText: (id, content) => {
      set((state) => {
        if (state.messagesById[id]) {
          state.messagesById[id].textContent = content;
        }
      });
    },

    appendLiveMessageText: (threadId, id, model, content, status) => {
      set((state) => {
        const message = state.messagesById[id];
        if (message) {
          message.textContent = (message.textContent || "") + content;
          if (status) {
            message.status = status;

            // Update thread streaming status
            state.threadStreamingStatus[threadId] =
              state.messagesByThread[threadId]?.some(
                (msgId) => state.messagesById[msgId]?.status === "streaming",
              ) ?? false;
          }
        } else {
          console.warn("Live message not found for append:", id);
          const newMessage: SavedMessage = {
            id,
            thread: threadId,
            textContent: content,
            sender: "llm",
            status: status ?? "streaming",
            model: model,
            messageAttachemts: [],
          };

          state.messagesById[id] = newMessage;

          if (!state.messagesByThread[threadId]) {
            state.messagesByThread[threadId] = [];
          }
          state.messagesByThread[threadId].push(id);

          state.threadStreamingStatus[threadId] = status === "streaming";
        }
      });
    },

    getLiveMessagesForThread: (threadId) => {
      const state = get();
      const messageIds = state.messagesByThread[threadId] || [];
      return messageIds.map((id) => state.messagesById[id]).filter(Boolean);
    },

    clearLiveMessages: () => {
      set((state) => {
        state.messagesByThread = {};
        state.messagesById = {};
        state.threadStreamingStatus = {};
      });
    },

    clearThread: (threadId) => {
      set((state) => {
        const messageIds = state.messagesByThread[threadId] || [];

        // Remove messages from messagesById
        for (const id of messageIds) {
          delete state.messagesById[id];
        }

        // Remove thread entries
        delete state.messagesByThread[threadId];
        delete state.threadStreamingStatus[threadId];
      });
    },
  })),
);

export const useLiveMessage = (id: string) => {
  return useLiveMessages(useShallow((state) => state.messagesById[id]));
};

export const useLiveMessagesForThread = (threadId: string) => {
  return useLiveMessages(
    useShallow((state) => state.messagesByThread[threadId] || []),
  );
};

export const useThreadIsStreaming = (threadId: string) => {
  return useLiveMessages(
    useShallow((state) => state.threadStreamingStatus[threadId] || false),
  );
};

// Additional useful selectors
export const useThreadMessageCount = (threadId: string) => {
  return useLiveMessages(
    useShallow((state) => state.messagesByThread[threadId]?.length || 0),
  );
};

export const useLastMessageInThread = (threadId: string) => {
  return useLiveMessages(
    useShallow((state) => {
      const messageIds = state.messagesByThread[threadId];
      if (!messageIds || messageIds.length === 0) return undefined;
      const lastId = messageIds[messageIds.length - 1];
      return state.messagesById[lastId];
    }),
  );
};
