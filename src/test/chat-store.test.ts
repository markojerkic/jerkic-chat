import { createId } from "@paralleldrive/cuid2";
import { ws } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { ChatStore } from "~/store/chat";

let sendMessages: WsMessage[] | null = null;
const chat = ws.link(/ws:\/\/localhost:\d+\/thread\/[^/]+\/ws/);
const server = setupServer(
  chat.addEventListener("connection", ({ server }) => {
    server.connect();
    server.addEventListener("open", () => {
      if (sendMessages == null) {
        console.error("messages are not prepared");
        return;
      }
      for (const message of sendMessages) {
        server.send(JSON.stringify(message));
      }
    });
  }),
);

const chatStore = new ChatStore();

beforeEach(() => {
  sendMessages = null;
  chatStore.addMessages(createId(), []);
});
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("propagate ws messages through chat store", () => {
  test("smoke test", () => {
    expect(chatStore.length).toBe(0);
  }, 30_000);
  test.for(testMessages)("parametrized smoke test", async (testCase) => {
    sendMessages = testCase;

    await vi.waitFor(() => {
      expect(chatStore.length).toBe(1);
    });
  });
});

const testMessages: WsMessage[][] = [
  [{ type: "text", id: "message-1", content: "Hope clouds observation" }],
];
