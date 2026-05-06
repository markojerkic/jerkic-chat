import { createId } from "@paralleldrive/cuid2";
import { ws } from "msw";
import { setupWorker } from "msw/browser";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render } from "vitest-browser-react";
import { MessagesList } from "~/components/thread/messages-list";
import { ChatStore } from "~/store/chat";
import {
  ReconnectingWebSocketListener,
  type MessageListenerFactory,
} from "~/store/message-listener";
import type { WsMessage } from "~/store/ws-message";

vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({
    useLoaderData: () => ({ user: { username: "Test User" } }),
  }),
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

vi.mock("~/components/message/message-footer", () => ({
  MessageFooter: () => null,
}));

describe("message list rendering", () => {
  const chat = ws.link(/ws:\/\/localhost:\d+\/thread\/[^/]+\/ws/);
  const worker = setupWorker();
  const reconnectingWebSocketListenerFactory: MessageListenerFactory = (
    threadId,
  ) => new ReconnectingWebSocketListener(threadId);
  let wsClient: { send: (data: string) => void } | undefined;

  beforeAll(async () => {
    await worker.start({ quiet: true });
  });

  beforeEach(() => {
    wsClient = undefined;
    worker.use(
      chat.addEventListener("connection", ({ client }) => {
        wsClient = client;
      }),
    );
  });

  afterEach(() => {
    worker.resetHandlers();
  });

  afterAll(() => worker.stop());

  it("should render existing messages", async () => {
    const chatStore = new ChatStore(reconnectingWebSocketListenerFactory);
    const threadId = createId();
    const responseId = createId();
    const responsePartId = createId();

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
        status: "streaming",
        parts: [
          {
            id: responsePartId,
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

    const screen = await render(<MessagesList chat={chatStore} />);

    expect(
      screen.container.querySelector("[data-sender='user']"),
      "should have the user message",
    ).toHaveTextContent("Kako se zoveš?");

    expect(
      screen.container.querySelector("[data-sender='llm']"),
      "should have the llm message",
    ).toHaveTextContent("Paul Atreid, knez Arrakisa");

    await vi.waitFor(() => expect(wsClient).toBeDefined());

    wsClient!.send(
      JSON.stringify({
        id: responsePartId,
        type: "text",
        content: " Muad'Dib.",
      } satisfies WsMessage),
    );

    await vi.waitFor(() => {
      expect(
        screen.container.querySelector("[data-sender='llm']"),
        "should have the complete llm message",
      ).toHaveTextContent("Paul Atreid, knez Arrakisa Muad'Dib");
    });
  });

  it("should add a reasoning block", async () => {
    const chatStore = new ChatStore(reconnectingWebSocketListenerFactory);
    const threadId = createId();
    const responseId = createId();
    const responsePartId = createId();

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
        status: "streaming",
        parts: [
          {
            id: responsePartId,
            type: "reasoning",
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

    const screen = await render(<MessagesList chat={chatStore} />);

    expect(
      screen.container.querySelector("[data-sender='user']"),
      "should have the user message",
    ).toHaveTextContent("Kako se zoveš?");

    expect(
      screen.container.querySelector("[data-sender='llm']"),
      "should have the llm message",
    ).toHaveTextContent("Paul Atreid, knez Arrakisa");

    await vi.waitFor(() => expect(wsClient).toBeDefined());

    wsClient!.send(
      JSON.stringify({
        id: createId(),
        type: "text",
        content: "Moj otac je Leto, i moj sin je Leto 2",
      } satisfies WsMessage),
    );

    await vi.waitFor(() => {
      expect(
        screen.getByText("Paul Atreid, knez Arrakisa"),
        "should have the first llm message",
      ).toBeInTheDocument();

      expect(
        screen.getByText("Moj otac je Leto, i moj sin je Leto 2"),
        "should have the second llm message",
      ).toBeInTheDocument();
    });
  });
});
