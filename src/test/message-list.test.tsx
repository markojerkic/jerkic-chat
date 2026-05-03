import { createId } from "@paralleldrive/cuid2";
import { queryByAttribute, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessagesList } from "~/components/thread/messages-list";
import { ChatStore } from "~/store/chat";

describe("message list rendering", () => {
  it("should render existing messages", () => {
    const chatStore = new ChatStore();
    const threadId = createId();
    const responseId = createId();
    chatStore.addMessages(threadId, [
      {
        id: createId(),
        textContent: "Kako se zoveš?",
        sender: "user",
        createdAt: new Date(2026, 5, 3, 19, 44),
        status: "done",
        parts: [],
        messageAttachemts: [],
        model: "arrakis/feydakin",
        order: 0,
      },
      {
        id: responseId,
        textContent: null,
        sender: "llm",
        createdAt: new Date(2026, 5, 3, 19, 45),
        status: "done",
        parts: [
          {
            id: createId(),
            type: "text",
            createdAt: new Date(2026, 5, 3, 19, 45, 1),
            messageId: responseId,
            textContent: {
              type: "text",
              content: "Paul Atreid, knez Arrakisa",
            },
          },
        ],
        messageAttachemts: [],
        model: "arrakis/feydakin",
        order: 1,
      },
    ]);

    const messageList = render(<MessagesList chat={chatStore} />);

    const senderElement = queryByAttribute("data-sender", messageList, "user");
    expect(senderElement).toBeDefined();
  });
});
