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
        debugger;
        // If message comes as delta over WS before response of action
        const currentStub = state.messages[id] ?? {};
        currentStub.thread = stub.thread;
        currentStub.textContent = stub.textContent;
        currentStub.id = stub.id;
        currentStub.sender = stub.sender;

        state.messages[id] = currentStub;
        const currentThreadMessages = state.messagesByThread[thread] ?? [];
        state.messagesByThread[thread] = [
          ...currentThreadMessages,
          currentStub,
        ];
        console.log("added message stub", currentStub);

        return state;
      });
    },
    addMessage(message) {
      set((state) => {
        debugger;
        state.messages[message.id] = message;
        const thread = message.thread;
        const currentThreadMessages = state.messagesByThread[thread] ?? [];
        state.messagesByThread[thread] = [...currentThreadMessages, message];

        return state;
      });
    },
    appendTextOfMessage(id, content) {
      set((state) => {
        debugger;
        let message = state.messages[id];

        if (!message) {
          message = {
            id,
            thread: "",
            sender: "llm",
            textContent: "",
          };
        }

        if (!message.textContent) {
          message.textContent = content;
        } else {
          message.textContent = message.textContent + content;
        }
        console.log("new content", message.textContent);

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
  debugger;
}

export function setMessagesOfThread(messages: Message[]) {
  const state = useMessages.getState();

  console.log("setting messages", messages);
  const newMessagesObject: Record<string, Message> = {};
  const newMessagesByThreadObject: Record<string, Message[]> =
    state.messagesByThread;

  if (Object.keys(newMessagesByThreadObject).length > 0) {
    console.warn("ne triba vamno");
    return;
  }

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
