import { describe, expect, test } from "vitest";
import type { MessagePartContentWithId } from "~/db/session/schema";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { ChatStore } from "~/store/chat";
import {
  MockWebSocketListener,
  mockWebSocketListenerFactory,
} from "~/store/message-listener";

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
});

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
];
