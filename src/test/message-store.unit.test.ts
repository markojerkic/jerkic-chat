import { createId } from "@paralleldrive/cuid2";
import { beforeEach, describe, expect, it } from "vitest";
import { ChatStore } from "~/store/chat";
import { ChatMessage } from "~/store/message";

const chatStore = new ChatStore();

beforeEach(() => chatStore.addMessages(createId(), []));

describe("message store appening of parts", () => {
  it.for(["text", "reasoning"] as const)("creates a %s part", (type) => {
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

    expect(store.messagePartIds).toStrictEqual([partId]);
    expect(store.messageParts.get(partId)).toStrictEqual({
      type,
      content: "Hello",
    });
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
