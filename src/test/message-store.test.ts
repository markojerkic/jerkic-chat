import { createId } from "@paralleldrive/cuid2";
import { beforeEach, describe, expect, it } from "vitest";
import type { MessagePartContentWithId } from "~/db/session/schema";
import { ChatStore } from "~/store/chat";
import { ChatMessage } from "~/store/message";

const chatStore = new ChatStore();

beforeEach(() => chatStore.addMessages(createId(), []));

type TestCaseOutput = {
  id: string;
  type: "reasoning" | "text";
  content: string;
};
type TestCase = {
  input: MessagePartContentWithId[];
  expected: TestCaseOutput[];
};

describe("message store appening of parts", () => {
  it.for(testCases)("should render", (testCase) => {
    const store = new ChatMessage(chatStore, {
      id: createId(),
      textContent: null,
      order: 1,
      model: "kwisatz/haderach",
      messageAttachemts: [],
      parts: [],
      status: "streaming",
      createdAt: new Date(2026, 1, 1),
      sender: "llm",
    });

    for (const part of testCase.input) {
      store.appendTextOfMessage(part);
    }

    expect(store.messagePartIds).toHaveLength(testCase.expected.length);
    const output = Object.entries(store.messageParts).map(
      ([id, part]) =>
        ({
          id,
          type: part.type,
          content: part.content,
        }) as TestCaseOutput,
    );

    expect(output).toBe(testCase.expected);
  });

  it.for(["text", "reasoning"] as const)(
    "appends to an existing %s part",
    (type) => {
      const store = new ChatMessage(chatStore, {
        id: createId(),
        textContent: null,
        order: 1,
        model: "kwisatz/haderach",
        messageAttachemts: [],
        parts: [],
        status: "streaming",
        createdAt: new Date(2026, 1, 1),
        sender: "llm",
      });

      const partId = createId();
      store.appendTextOfMessage({
        id: partId,
        type,
        content: "Hello",
      });
      store.appendTextOfMessage({
        id: partId,
        type,
        content: ", world!",
      });

      expect(store.messagePartIds).toStrictEqual([partId]);
      expect(store.messageParts.get(partId)).toStrictEqual({
        type,
        content: "Hello, world!",
      });
    },
  );
}, 30_000);

const testCases: TestCase[] = [
  {
    input: [
      { id: "part-1", type: "text", content: "I " },
      { id: "part-1", type: "text", content: "must " },
      { id: "part-1", type: "text", content: "not " },
      { id: "part-1", type: "text", content: "fear." },
      { id: "part-2", type: "reasoning", content: "Fear " },
      { id: "part-2", type: "reasoning", content: "is " },
      { id: "part-2", type: "reasoning", content: "the " },
      { id: "part-2", type: "reasoning", content: "mind-" },
      { id: "part-2", type: "reasoning", content: "killer." },
    ],
    expected: [
      { id: "part-1", type: "text", content: "I must not fear" },
      { id: "part-1", type: "reasoning", content: "Fear is the mind-killer" },
    ],
  },
];
