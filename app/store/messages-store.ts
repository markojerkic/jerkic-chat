import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type Message = {
  thread: string;
  id: string;
  sender: "user" | "llm";
  textContent: string | null;
};

type MessagesState = {
  messages: Record<string, Message>;
  messagesByThread: Record<string, Message[]>;
  addStubLlmMessage: (thread: string, id: string) => void;
  addMessage: (msg: Message) => void;
  updateTextOfMessage: (id: string, content: string) => void;
  appendTextOfMessage: (id: string, content: string) => void;
  ensureMessageInThread: (messageId: string, threadId: string) => void;
};

export const useMessages = create<MessagesState>()(
  devtools(
    immer((set) => ({
      messages: {},
      messagesByThread: {},

      addStubLlmMessage(thread, id) {
        set((state) => {
          const stub = {
            id,
            thread,
            sender: "llm" as const,
            textContent: null,
          };

          // Always add/update the message in the messages object
          state.messages[id] = stub;

          // Ensure thread array exists
          if (!state.messagesByThread[thread]) {
            state.messagesByThread[thread] = [];
          }

          // Check if message is already in thread (to avoid duplicates)
          const threadMessages = state.messagesByThread[thread];
          const existingIndex = threadMessages.findIndex(
            (msg) => msg.id === id
          );

          if (existingIndex >= 0) {
            // Replace existing message
            threadMessages[existingIndex] = stub;
          } else {
            // Add new message
            threadMessages.push(stub);
          }

          console.log(
            "added message stub",
            id,
            "to thread",
            thread,
            state.messages[id]
          );
        });
      },

      addMessage(message) {
        set((state) => {
          state.messages[message.id] = message;

          if (!state.messagesByThread[message.thread]) {
            state.messagesByThread[message.thread] = [];
          }

          // Check if message is already in thread (to avoid duplicates)
          const threadMessages = state.messagesByThread[message.thread];
          const existingIndex = threadMessages.findIndex(
            (msg) => msg.id === message.id
          );

          if (existingIndex >= 0) {
            // Replace existing message
            threadMessages[existingIndex] = message;
          } else {
            // Add new message
            threadMessages.push(message);
          }
        });
      },

      appendTextOfMessage(id, content) {
        set((state) => {
          let message = state.messages[id];

          if (!message) {
            // This can happen if appendText is called before the stub is created
            // Let's create a temporary message and log a warning
            console.warn(
              `Message with id ${id} not found when trying to append text. Creating temporary message.`
            );
            message = {
              id,
              thread: "", // Thread will need to be set later
              sender: "llm" as const,
              textContent: "",
            };
            state.messages[id] = message;
          }

          if (!message.textContent) {
            message.textContent = content;
          } else {
            message.textContent = message.textContent + content;
          }

          console.log(
            "appended text to message",
            id,
            "new length:",
            message.textContent.length
          );
        });
      },

      updateTextOfMessage(id, content) {
        set((state) => {
          const message = state.messages[id];
          if (message) {
            // Create a new message object to ensure reactivity
            const updatedMessage = {
              ...message,
              textContent: content,
            };

            // Update in messages store
            state.messages[id] = updatedMessage;

            // Update in thread messages array if it exists
            if (message.thread && state.messagesByThread[message.thread]) {
              const threadMessages = state.messagesByThread[message.thread];
              const messageIndex = threadMessages.findIndex((m) => m.id === id);
              if (messageIndex >= 0) {
                threadMessages[messageIndex] = updatedMessage;
              }
            }
          } else {
            console.warn(
              `Message with id ${id} not found when trying to update text.`
            );
          }
        });
      },

      // Helper function to ensure a message is properly associated with a thread
      ensureMessageInThread(messageId, threadId) {
        set((state) => {
          const message = state.messages[messageId];
          if (message && !message.thread) {
            message.thread = threadId;

            // Add to thread if not already there
            if (!state.messagesByThread[threadId]) {
              state.messagesByThread[threadId] = [];
            }

            const threadMessages = state.messagesByThread[threadId];
            const exists = threadMessages.some((msg) => msg.id === messageId);
            if (!exists) {
              threadMessages.push(message);
            }
          }
        });
      },
    }))
  )
);

export function addRequestAndStubMessage({
  newMessageId,
  sentMessageId,
  q,
  threadId,
}: {
  newMessageId: string;
  sentMessageId: string;
  threadId: string;
  q: string;
}) {
  console.log("Adding request and stub message:", {
    newMessageId,
    sentMessageId,
    threadId,
    q,
  });

  const state = useMessages.getState();

  // Add user message
  state.addMessage({
    thread: threadId,
    sender: "user",
    id: sentMessageId,
    textContent: q,
  });

  // Add stub LLM message
  state.addStubLlmMessage(threadId, newMessageId);

  // Ensure any orphaned messages get associated with this thread
  state.ensureMessageInThread(newMessageId, threadId);

  // Debug: check what's in the store after adding
  const updatedState = useMessages.getState();
  console.log("After adding messages:", {
    totalMessages: Object.keys(updatedState.messages).length,
    threadMessages: updatedState.messagesByThread[threadId]?.length || 0,
    userMessage: updatedState.messages[sentMessageId],
    stubMessage: updatedState.messages[newMessageId],
  });
}

export function setMessagesOfThread(messages: Message[]) {
  const state = useMessages.getState();

  console.log("setting messages", messages);

  // If we already have messages, don't overwrite (based on your logic)
  if (Object.keys(state.messagesByThread).length > 0) {
    console.warn("ne triba vamno");
    return;
  }

  // Use the store's set method to properly update state
  useMessages.setState((state) => {
    const newMessages: Record<string, Message> = {};
    const newMessagesByThread: Record<string, Message[]> = {};

    for (const message of messages) {
      newMessages[message.id] = message;

      if (!newMessagesByThread[message.thread]) {
        newMessagesByThread[message.thread] = [];
      }
      newMessagesByThread[message.thread].push(message);
    }

    return {
      ...state,
      messages: newMessages,
      messagesByThread: newMessagesByThread,
    };
  });
}

export const useMessage = (id: string) => {
  return useMessages(useShallow((state) => state.messages[id]));
};

export const useMessageIdsOfThread = (threadId: string) => {
  return useMessages(
    useShallow((state) =>
      (state.messagesByThread[threadId] ?? []).map((message) => message.id)
    )
  );
};

// Debug utility - safe to use with effects
export const useDebugMessages = () => {
  return useMessages(
    useShallow((state) => ({
      totalMessages: Object.keys(state.messages).length,
      threads: Object.keys(state.messagesByThread),
      messagesCount: Object.keys(state.messages).length,
      threadsCount: Object.keys(state.messagesByThread).length,
    }))
  );
};

// Separate debug function that doesn't cause re-renders
export const debugStoreState = () => {
  const state = useMessages.getState();
  console.log("Store debug:", {
    totalMessages: Object.keys(state.messages).length,
    threads: Object.keys(state.messagesByThread),
    messages: state.messages,
    messagesByThread: state.messagesByThread,
  });
};
