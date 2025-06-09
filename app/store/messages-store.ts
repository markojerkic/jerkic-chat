import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { devtools } from "zustand/middleware";

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
  devtools((set) => ({
    messages: {},
    messagesByThread: {},
    addStubLlmMessage(thread, id) {
      set((state) => {
        const stub = {
          id,
          thread,
          sender: "llm",
          textContent: null,
        } satisfies Message;
        state.messages[id] = stub;
        const currentThreadMessages = state.messagesByThread[thread] ?? [];
        state.messagesByThread[thread] = [...currentThreadMessages, stub];

        return state;
      });
    },
    addMessage(message) {
      set((state) => {
        state.messages[message.id] = message;
        const thread = message.thread;
        const currentThreadMessages = state.messagesByThread[thread] ?? [];
        state.messagesByThread[thread] = [...currentThreadMessages, message];

        return state;
      });
    },
    appendTextOfMessage(id, content) {
      set((state) => {
        const message = state.messages[id];
        message.textContent = message.textContent + content;

        return { ...state };
      });
    },

    updateTextOfMessage(id, content) {
      set((state) => {
        const message = state.messages[id];
        message.textContent = content;

        return { ...state };
      });
    },
  }))
);

export function setMessagesOfThread(messages: Message[]) {
  const state = useMessages.getState();

  console.log("setting messages", messages);
  const newMessagesObject: Record<string, Message> = {};
  const newMessagesByThreadObject: Record<string, Message[]> =
    state.messagesByThread;

  for (const message of messages) {
    newMessagesObject[message.id] = message;
    const currentThreadMessages = newMessagesByThreadObject[message.thread];
    if (currentThreadMessages) {
      currentThreadMessages.push(message);
    } else {
      newMessagesByThreadObject[message.thread] = [message];
    }
  }

  state.messages = newMessagesObject;
  state.messagesByThread = newMessagesByThreadObject;

  useMessages.setState(state);
}

export const useMessage = (id: string) => {
  return useMessages(
    useShallow((messages) => {
      return messages.messages[id];
    })
  );
};

export const useMessageIdsOfThread = (threadId: string) => {
  return useMessages(
    useShallow((messages) => {
      return (messages.messagesByThread[threadId] ?? []).map(
        (message) => message.id
      );
    })
  );
};
