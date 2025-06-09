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

          // If message comes as delta over WS before response of action
          const existingMessage = state.messages[id];
          if (existingMessage) {
            // Update existing message
            existingMessage.thread = stub.thread;
            existingMessage.textContent = stub.textContent;
            existingMessage.sender = stub.sender;
          } else {
            // Add new message
            state.messages[id] = stub;

            // Add to thread messages if not already there
            if (!state.messagesByThread[thread]) {
              state.messagesByThread[thread] = [];
            }

            // Check if message is already in thread (to avoid duplicates)
            const threadMessages = state.messagesByThread[thread];
            const exists = threadMessages.some((msg) => msg.id === id);
            if (!exists) {
              threadMessages.push(stub);
            }
          }

          console.log("added message stub", state.messages[id]);
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
            // Create a new message if it doesn't exist
            message = {
              id,
              thread: "", // This might need to be set properly based on your use case
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

          console.log("new content", message.textContent);
        });
      },

      updateTextOfMessage(id, content) {
        set((state) => {
          const message = state.messages[id];
          if (message) {
            message.textContent = content;
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
  const state = useMessages.getState();
  state.addMessage({
    thread: threadId,
    sender: "user",
    id: sentMessageId,
    textContent: q,
  });
  state.addStubLlmMessage(threadId, newMessageId);
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
