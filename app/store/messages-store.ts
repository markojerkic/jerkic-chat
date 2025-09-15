import { uuidv7 } from "uuidv7";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { SavedMessage } from "~/database/schema";
import type { BranchRequest } from "~/routes/branch";

type LiveMessagesState = {
  threadNames: Record<string, string>;
  messagesByThread: Record<string, string[]>;
  messagesById: Record<string, SavedMessage>;
  threadStreamingStatus: Record<string, boolean>;

  // Actions
  addMessages: (messages: SavedMessage[]) => void;
  addLiveMessage: (message: SavedMessage) => void;
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
  branchOff: (threadId: string, upToMessageId: string) => BranchRequest;
  setThreadName: (threadId: string, name: string) => void;
  getLastModelOfThread: (threadId: string) => string | undefined;
  retryMessage: (messageId: string, threadId: string, model: string) => void;
};

export const useLiveMessages = create<LiveMessagesState>()(
  immer((set, get) => ({
    threadNames: {},
    messagesByThread: {},
    messagesById: {},
    threadStreamingStatus: {},

    retryMessage: (messageId, threadId, model) => {
      console.log("retrying message", messageId, threadId, model);
      set((state) => {
        const targetMessage = state.messagesById[messageId];
        if (!targetMessage) {
          console.warn(`Message ${messageId} not found in messagesById`);
          return;
        }
        targetMessage.textContent = "";
        targetMessage.status = "streaming";
        targetMessage.model = model;

        const newMessagesOfThread: SavedMessage[] = [];

        const messageIds = state.messagesByThread[threadId] || [];
        const sortedMessageIds = messageIds.toSorted();

        for (const id of sortedMessageIds) {
          // if before messageId, or messageId itself, continue, else delete
          if (id < messageId) {
            newMessagesOfThread.push(state.messagesById[id]);
            continue;
          }

          if (id === messageId) {
            newMessagesOfThread.push(targetMessage);
            break;
          }
          delete state.messagesById[id];
        }

        state.messagesByThread[threadId] = newMessagesOfThread.map((m) => m.id);
        state.messagesById[messageId] = targetMessage;
        state.threadStreamingStatus[threadId] = true;
      });
    },

    getLastModelOfThread: (threadId) => {
      const state = get();
      const messageIds = state.messagesByThread[threadId] || [];
      // Sort ascending to get the latest message at the end
      const sortedMessageIds = messageIds.toSorted();
      if (!sortedMessageIds.length) return undefined;
      const lastMessage =
        state.messagesById[sortedMessageIds[sortedMessageIds.length - 1]];
      return lastMessage?.model as string | undefined;
    },

    setThreadName: (threadId, name) => {
      set((state) => {
        state.threadNames[threadId] = name;
      });
    },

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
      // Sort ascending (earliest to latest)
      const sortedMessageIds = messageIds.toSorted();
      return sortedMessageIds
        .map((id) => state.messagesById[id])
        .filter(Boolean);
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

    branchOff: (threadId: string, upToMessageId: string) => {
      const state = get();
      const messageIds = state.messagesByThread[threadId] ?? [];
      // Sort ascending to process messages in chronological order
      const sortedMessageIds = messageIds.toSorted();

      if (!sortedMessageIds.length) {
        throw new Error(`Thread ${threadId} not found or empty`);
      }

      if (!sortedMessageIds.includes(upToMessageId)) {
        throw new Error(
          `Message ID ${upToMessageId} not found in thread ${threadId}`,
        );
      }

      const newThreadId = uuidv7();
      const mappings: { from: string; to: string }[] = [];
      const newMessages: SavedMessage[] = [];

      for (const id of sortedMessageIds) {
        const message = state.messagesById[id];
        if (!message) {
          console.warn(`Message ${id} not found in messagesById`);
          continue;
        }

        const newMessageId = uuidv7();
        const newMessage: SavedMessage = {
          ...message,
          id: newMessageId,
          thread: newThreadId,
          status: "done",
        };
        mappings.push({
          from: id,
          to: newMessageId,
        });
        newMessages.push(newMessage);

        if (id === upToMessageId) {
          break;
        }
      }

      state.addMessages(newMessages);

      return {
        fromThreadId: threadId,
        newThreadId,
        mappings,
      };
    },
  })),
);

export const useLiveMessage = (id: string) => {
  return useLiveMessages(useShallow((state) => state.messagesById[id]));
};

export const useModelOfMessage = (id: string) => {
  return useLiveMessages(
    useShallow((state) => state.messagesById[id]?.model),
  ) as string | undefined;
};

export const useLiveMessagesForThread = (threadId: string) => {
  return useLiveMessages(
    useShallow((state) => {
      const messageIds = state.messagesByThread[threadId] || [];
      const sortedMessageIds = messageIds.toSorted();
      return sortedMessageIds
        .map((id) => state.messagesById[id])
        .filter(Boolean);
    }),
  );
};

export const useThreadIsStreaming = (threadId: string) => {
  return useLiveMessages(
    useShallow((state) => state.threadStreamingStatus[threadId] || false),
  );
};
export const isThreadStreaming = (threadId: string) => {
  return useLiveMessages.getState().threadStreamingStatus[threadId] ?? false;
};

export const useLastMessageInThread = (threadId: string) => {
  return useLiveMessages(
    useShallow((state) => {
      const messageIds = state.messagesByThread[threadId];
      if (!messageIds || messageIds.length === 0) return undefined;
      const sortedMessageIds = messageIds.toSorted();
      const lastId = sortedMessageIds[sortedMessageIds.length - 1];
      return state.messagesById[lastId];
    }),
  );
};

export const useBranchOff = () => {
  return useLiveMessages(useShallow((state) => state.branchOff));
};

export const useMessageIdsForThread = (threadId: string) => {
  return useLiveMessages(
    useShallow((state) => {
      const messageIds = state.messagesByThread[threadId] || [];
      return messageIds.toSorted();
    }),
  );
};

export const useRetryMessage = () => {
  return useLiveMessages(useShallow((state) => state.retryMessage));
};
