import { describe, expect, test } from "vitest";
import type {
  MessagePartContentWithId,
  SavedMessageWithParts,
} from "~/db/session/schema";
import { ChatStore } from "~/store/chat";
import {
  MockWebSocketListener,
  mockWebSocketListenerFactory,
} from "~/store/message-listener";
import type { WsMessage } from "~/store/ws-message";

type TestCase = {
  name: string;
  wsMessages: WsMessage[];
  expectedParts: MessagePartContentWithId[];
};

describe("propagate ws messages through chat store", () => {
  test("smoke test", () => {
    const chatStore = new ChatStore(mockWebSocketListenerFactory());

    expect(chatStore.length).toBe(0);
  }, 30_000);

  test.for(testCases)("applies websocket messages: $name", async (testCase) => {
    const listeners: MockWebSocketListener[] = [];
    const chatStore = new ChatStore(
      mockWebSocketListenerFactory((ml) => {
        listeners.push(ml);
      }),
    );

    chatStore.addMessages("thread-1", [
      {
        id: "message-1",
        createdAt: new Date(2026, 1, 1),
        status: "streaming",
        textContent: null,
        model: "test-model",
        sender: "llm",
        order: 1,
        messageAttachemts: [],
        parts: [],
      },
    ]);

    const mockListener = listeners[0];

    if (mockListener === undefined) {
      throw new Error("Listener should be defined");
    }

    for (const message of testCase.wsMessages) {
      mockListener.mockServerMessage(message);
    }

    expect(chatStore.lastMessage?.messageParts).toHaveLength(
      testCase.expectedParts.length,
    );

    const output = Array.from(
      chatStore.lastMessage!.messageParts.entries(),
    ).map(([id, part]) => ({ ...part, id }));

    expect(output).toStrictEqual(testCase.expectedParts);
  });

  test("marks store done when message finishes", () => {
    const listeners: MockWebSocketListener[] = [];
    const chatStore = new ChatStore(
      mockWebSocketListenerFactory((ml) => {
        listeners.push(ml);
      }),
    );

    chatStore.addMessages("thread-1", [
      {
        id: "message-1",
        createdAt: new Date(2026, 1, 1),
        status: "streaming",
        textContent: null,
        model: "test-model",
        sender: "llm",
        order: 1,
        messageAttachemts: [],
        parts: [],
      },
    ]);

    listeners[0]!.mockServerMessage({
      id: "message-1",
      createdAt: new Date(2026, 1, 1),
      status: "done",
      textContent: null,
      model: "test-model",
      sender: "llm",
      order: 1,
      messageAttachemts: [],
      parts: [],
      type: "message-finished",
    });

    expect(chatStore.state).toBe("done");
    expect(chatStore.lastMessage?.status).toBe("done");
  });

  test("keeps optimistic messages when same thread snapshot is empty", () => {
    const chatStore = new ChatStore(mockWebSocketListenerFactory());

    chatStore.setThreadId("thread-1");
    chatStore.addMessageWithResponse(
      {
        id: "message-1",
        createdAt: new Date(2026, 1, 1),
        status: "done",
        textContent: "Hello",
        model: "test-model",
        sender: "user",
        order: 0,
        messageAttachemts: [],
        parts: [],
      },
      "message-2",
    );

    chatStore.addMessages("thread-1", []);

    expect(chatStore.messageIds).toEqual(["message-1", "message-2"]);
  });

  test("clears the last llm message when retrying it", () => {
    const chatStore = new ChatStore(mockWebSocketListenerFactory());

    chatStore.addMessages("thread-1", createRetryMessages());

    chatStore.retryMessage("message-4", "arrakis/fedaykin");

    expect(chatStore.state).toBe("streaming");
    expect(chatStore.messageIds).toEqual([
      "message-1",
      "message-2",
      "message-3",
      "message-4",
    ]);
    expect(chatStore.lastMessage?.id).toBe("message-4");
    expect(chatStore.lastMessage?.status).toBe("streaming");
    expect(chatStore.lastMessage?.textContent).toBeNull();
    expect(chatStore.lastMessage?.messagePartIds).toEqual([]);
    expect(chatStore.lastMessage?.messageParts.size).toBe(0);
  });

  test("clears a retried llm message from further up the session", () => {
    const chatStore = new ChatStore(mockWebSocketListenerFactory());

    chatStore.addMessages("thread-1", createRetryMessages());

    chatStore.retryMessage("message-2", "arrakis/fedaykin");

    expect(chatStore.state).toBe("streaming");
    expect(chatStore.messageIds).toEqual(["message-1", "message-2"]);
    expect(chatStore.messages.has("message-3")).toBe(false);
    expect(chatStore.messages.has("message-4")).toBe(false);
    expect(chatStore.lastMessage?.id).toBe("message-2");
    expect(chatStore.lastMessage?.status).toBe("streaming");
    expect(chatStore.lastMessage?.textContent).toBeNull();
    expect(chatStore.lastMessage?.messagePartIds).toEqual([]);
    expect(chatStore.lastMessage?.messageParts.size).toBe(0);
  });

  test("retries an llm message after the server replaces its id", () => {
    const listeners: MockWebSocketListener[] = [];
    const chatStore = new ChatStore(
      mockWebSocketListenerFactory((ml) => {
        listeners.push(ml);
      }),
    );

    chatStore.addMessages("thread-1", createRetryMessages());
    chatStore.retryMessage("message-4", "arrakis/fedaykin");

    listeners[0]!.mockServerMessage({
      id: "message-5",
      createdAt: new Date(2026, 4, 7, 18, 29, 5),
      status: "done",
      textContent: null,
      model: "arrakis/fedaykin",
      sender: "llm",
      order: 1,
      messageAttachemts: [],
      parts: [
        {
          id: "part-5",
          messageId: "message-5",
          createdAt: new Date(2026, 4, 7, 18, 29, 5),
          type: "text",
          textContent: {
            type: "text",
            content: "Replacement response.",
          },
        },
      ],
      type: "message-finished",
    });

    expect(chatStore.messageIds).toEqual([
      "message-1",
      "message-2",
      "message-3",
      "message-5",
    ]);
    expect(chatStore.messages.has("message-4")).toBe(false);
    expect(chatStore.getMessage("message-5")?.messagePartIds).toEqual([
      "part-5",
    ]);

    chatStore.retryMessage("message-5", "arrakis/fedaykin");
    listeners[0]!.mockServerMessage({
      type: "text",
      id: "part-6",
      content: "Clean retry chunk.",
    });

    expect(chatStore.lastMessage?.id).toBe("message-5");
    expect(chatStore.lastMessage?.messagePartIds).toEqual(["part-6"]);
    expect(Array.from(chatStore.lastMessage!.messageParts.entries())).toEqual([
      ["part-6", { type: "text", content: "Clean retry chunk." }],
    ]);
  });

  test("does not retry user messages", () => {
    const chatStore = new ChatStore(mockWebSocketListenerFactory());

    chatStore.addMessages("thread-1", createRetryMessages());

    chatStore.retryMessage("message-3", "arrakis/fedaykin");

    expect(chatStore.state).toBe("done");
    expect(chatStore.messageIds).toEqual([
      "message-1",
      "message-2",
      "message-3",
      "message-4",
    ]);
    expect(chatStore.getMessage("message-3")?.textContent).toBe(
      "Who is a fedaykin?",
    );
    expect(chatStore.lastMessage?.id).toBe("message-4");
    expect(chatStore.lastMessage?.status).toBe("done");
  });
});

function createRetryMessages(): SavedMessageWithParts[] {
  const createdAt = new Date(2026, 4, 7, 18, 29, 0);

  return [
    {
      id: "message-1",
      createdAt,
      status: "done",
      textContent: "What is a fedaykin?",
      model: "arrakis/fedaykin",
      sender: "user",
      order: 0,
      messageAttachemts: [],
      parts: [],
    },
    {
      id: "message-2",
      createdAt: new Date(createdAt.getTime() + 1),
      status: "done",
      textContent: "A fedaykin is an Arrakis warrior.",
      model: "arrakis/fedaykin",
      sender: "llm",
      order: 1,
      messageAttachemts: [],
      parts: [
        {
          id: "part-1",
          messageId: "message-2",
          createdAt: new Date(createdAt.getTime() + 1),
          type: "text",
          textContent: {
            type: "text",
            content: "A fedaykin is an Arrakis warrior.",
          },
        },
      ],
    },
    {
      id: "message-3",
      createdAt: new Date(createdAt.getTime() + 2),
      status: "done",
      textContent: "Who is a fedaykin?",
      model: "arrakis/fedaykin",
      sender: "user",
      order: 0,
      messageAttachemts: [],
      parts: [],
    },
    {
      id: "message-4",
      createdAt: new Date(createdAt.getTime() + 3),
      status: "done",
      textContent: null,
      model: "arrakis/fedaykin",
      sender: "llm",
      order: 1,
      messageAttachemts: [],
      parts: [
        {
          id: "part-2",
          messageId: "message-4",
          createdAt: new Date(createdAt.getTime() + 3),
          type: "text",
          textContent: {
            type: "text",
            content: "A trained warrior loyal to the Fremen cause.",
          },
        },
      ],
    },
  ];
}

const testCases: TestCase[] = [
  {
    name: "single text chunk",
    wsMessages: [
      { type: "text", id: "part-1", content: "Hope clouds observation" },
    ],
    expectedParts: [
      { type: "text", id: "part-1", content: "Hope clouds observation" },
    ],
  },
  {
    name: "multiple text chunks for same part",
    wsMessages: [
      { type: "text", id: "part-1", content: "Hope " },
      { type: "text", id: "part-1", content: "clouds " },
      { type: "text", id: "part-1", content: "observation" },
    ],
    expectedParts: [
      { type: "text", id: "part-1", content: "Hope clouds observation" },
    ],
  },
  {
    name: "live web search part",
    wsMessages: [
      {
        type: "web-search",
        id: "part-1",
        search: ["Mistborn movie screenplay"],
        results: [],
      },
    ],
    expectedParts: [
      {
        type: "web-search",
        id: "part-1",
        search: ["Mistborn movie screenplay"],
        results: [],
      },
    ],
  },
  {
    name: "live web fetch part",
    wsMessages: [
      {
        type: "web-fetch",
        id: "part-1",
        search: [
          "https://www.polygon.com/brandon-sanderson-mistborn-movie-james-gunn-model-script/",
        ],
        results: [],
      },
    ],
    expectedParts: [
      {
        type: "web-fetch",
        id: "part-1",
        search: [
          "https://www.polygon.com/brandon-sanderson-mistborn-movie-james-gunn-model-script/",
        ],
        results: [],
      },
    ],
  },
  {
    name: "live error part",
    wsMessages: [
      { type: "text", id: "part-1", content: "Partial response" },
      { type: "error", id: "part-2", content: "Model overloaded" },
    ],
    expectedParts: [
      { type: "text", id: "part-1", content: "Partial response" },
      { type: "error", id: "part-2", content: "Model overloaded" },
    ],
  },
];
