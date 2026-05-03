import { createId } from "@paralleldrive/cuid2";
import { waitFor } from "@testing-library/react";
import { ws } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render } from "vitest-browser-react";
import { MessagesList } from "~/components/thread/messages-list";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { ChatStore } from "~/store/chat";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );

  return {
    ...actual,
    useParams: () => ({}),
  };
});

const chat = ws.link("ws://localhost/thread/:threadId/ws");
const server = setupServer();

describe("message list rendering", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should render existing messages", async () => {
    let resolveConnected: () => void;
    const connected = new Promise<void>((resolve) => {
      resolveConnected = resolve;
    });
    let wsClient: { send: (data: string) => void };

    server.use(
      chat.addEventListener("connection", ({ client }) => {
        wsClient = client;
        resolveConnected();
      }),
    );

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
        status: "streaming",
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

    const screen = await render(<MessagesList chat={chatStore} />);

    expect(screen.getByText("Kako se zoveš?")).toBeDefined();
    expect(screen.getByText("Paul Atreid, knez Arrakisa")).toBeDefined();

    wsClient!.send(
      JSON.stringify({
        id: createId(),
        type: "text",
        content: " Muad'Dib.",
      } satisfies WsMessage),
    );

    await waitFor(() => {
      expect(screen.getByText(/Muad'Dib/)).toBeDefined();
    });
  });
});
