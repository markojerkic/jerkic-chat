import { createId } from "@paralleldrive/cuid2";
import { beforeEach, describe, expect, it } from "vitest";
import type { MessagePartContentWithId } from "~/db/session/schema";
import { ChatStore } from "~/store/chat";
import { ChatMessage } from "~/store/message";
import { mockWebSocketListenerFactory } from "~/store/message-listener";

const chatStore = new ChatStore(mockWebSocketListenerFactory());

beforeEach(() => chatStore.addMessages(createId(), []));

type TestCase = {
  name: string;
  input: MessagePartContentWithId[];
  expected: MessagePartContentWithId[];
};

describe("message store appening of parts", () => {
  it.for(testCases)("should aggregate message parts: $name", (testCase) => {
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
    const output = Array.from(store.messageParts.entries()).map(
      ([id, part]) => ({ ...part, id }),
    );

    expect(output).toStrictEqual(testCase.expected);
  });
}, 30_000);

const testCases: TestCase[] = [
  {
    name: "one text, one reasoning",
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
      { id: "part-1", type: "text", content: "I must not fear." },
      { id: "part-2", type: "reasoning", content: "Fear is the mind-killer." },
    ],
  },
  {
    name: "two reasonings, one text",
    input: [
      { id: "part-1", type: "reasoning", content: "I " },
      { id: "part-1", type: "reasoning", content: "must " },
      { id: "part-1", type: "reasoning", content: "not " },
      { id: "part-1", type: "reasoning", content: "fear." },
      { id: "part-2", type: "reasoning", content: "Fear " },
      { id: "part-2", type: "reasoning", content: "is " },
      { id: "part-2", type: "reasoning", content: "the " },
      { id: "part-2", type: "reasoning", content: "mind-" },
      { id: "part-2", type: "reasoning", content: "killer." },
      { id: "part-3", type: "text", content: "Fear " },
      { id: "part-3", type: "text", content: "is " },
      { id: "part-3", type: "text", content: "the " },
      { id: "part-3", type: "text", content: "little-death " },
      { id: "part-3", type: "text", content: "that " },
      { id: "part-3", type: "text", content: "brings " },
      { id: "part-3", type: "text", content: "total " },
      { id: "part-3", type: "text", content: "obliteration." },
    ],
    expected: [
      { id: "part-1", type: "reasoning", content: "I must not fear." },
      { id: "part-2", type: "reasoning", content: "Fear is the mind-killer." },
      {
        id: "part-3",
        type: "text",
        content: "Fear is the little-death that brings total obliteration.",
      },
    ],
  },
  {
    name: "one reasoning, one web-search",
    input: [
      { id: "part-1", type: "reasoning", content: "What " },
      { id: "part-1", type: "reasoning", content: "do " },
      { id: "part-1", type: "reasoning", content: "you " },
      { id: "part-1", type: "reasoning", content: "despise?" },
      {
        id: "part-2",
        type: "web-search",
        search: ["Who does princess Irulan despise?"],
        results: [],
      },
    ],
    expected: [
      { id: "part-1", type: "reasoning", content: "What do you despise?" },
      {
        id: "part-2",
        type: "web-search",
        search: ["Who does princess Irulan despise?"],
        results: [],
      },
    ],
  },
  {
    name: "one text, one error",
    input: [
      { id: "part-1", type: "text", content: "I must " },
      { id: "part-1", type: "text", content: "not fear." },
      { id: "part-2", type: "error", content: "The gom jabbar failed." },
    ],
    expected: [
      { id: "part-1", type: "text", content: "I must not fear." },
      { id: "part-2", type: "error", content: "The gom jabbar failed." },
    ],
  },
];
