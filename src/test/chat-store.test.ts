import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MessagePartContentWithId } from "~/db/session/schema";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { ChatStore } from "~/store/chat";

type TestCase = {
  name: string;
  wsMessages: WsMessage[];
  expectedParts: MessagePartContentWithId[];
};

let sendMessages: WsMessage[] | null = null;

vi.mock("reconnecting-websocket", () => ({
  default: class MockReconnectingWebSocket {
    public onopen: (() => void) | null = null;
    public onclose: (() => void) | null = null;
    public onerror: (() => void) | null = null;
    public onmessage: ((event: { data: string }) => void) | null = null;

    constructor() {
      setTimeout(() => {
        this.onopen?.();

        if (sendMessages == null) {
          throw new Error("messages are not prepared");
        }

        for (const message of sendMessages) {
          this.onmessage?.({ data: JSON.stringify(message) });
        }
      });
    }

    public close() {
      this.onclose?.();
    }

    public send() {}
  },
}));

beforeEach(() => {
  sendMessages = null;
});

describe("propagate ws messages through chat store", () => {
  test("smoke test", () => {
    const chatStore = new ChatStore();

    expect(chatStore.length).toBe(0);
  }, 30_000);

  test.for(testCases)("applies websocket messages: $name", async (testCase) => {
    const chatStore = new ChatStore();
    sendMessages = testCase.wsMessages;

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

    await vi.waitFor(() => {
      expect(chatStore.lastMessage?.messageParts).toHaveLength(
        testCase.expectedParts.length,
      );
    });

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
