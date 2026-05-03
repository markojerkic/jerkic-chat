import { createId } from "@paralleldrive/cuid2";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { ws } from "msw";
import { setupWorker } from "msw/browser";
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
import type { WsMessage } from "~/hooks/use-ws-messages";
import { routeTree } from "~/routeTree.gen";
import { ChatContext, ChatStore } from "~/store/chat";

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtools: () => null,
}));

vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));

vi.mock("~/components/message/message-footer", () => ({
  MessageFooter: () => null,
}));

vi.mock("~/components/thread/thread-composer", () => ({
  ThreadComposer: () => null,
}));

vi.mock("~/server/auth/utils", () => ({
  authMiddleware: {},
  getCurrentUser: vi.fn(async () => ({
    id: "test-user-id",
    githubId: 1,
    username: "Test User",
  })),
}));

vi.mock("~/server/llm/models.functions", () => ({
  getModels: vi.fn(async () => [
    {
      name: "Feydakin",
      slug: "arrakis/feydakin",
    },
  ]),
}));

vi.mock("~/server/thread-actions.functions", () => ({
  getUserThreads: vi.fn(async () => ({
    threads: [],
  })),
  getInitialThreadData: vi.fn(async () => ({
    lastModel: "arrakis/feydakin",
    messages: [],
    title: "Test thread",
  })),
}));

const chat = ws.link(/ws:\/\/localhost:\d+\/thread\/[^/]+\/ws/);
const worker = setupWorker();
let wsClient: { send: (data: string) => void };

beforeAll(async () => {
  await worker.start({ quiet: true });

  worker.use(
    chat.addEventListener("connection", ({ client }) => {
      wsClient = client;
    }),
  );
});

afterEach(() => worker.resetHandlers());
afterAll(() => worker.stop());

describe("message list route rendering", () => {
  it("should render messages through the full router tree", async () => {
    const queryClient = new QueryClient();
    const chatStore = new ChatStore();
    const threadId = createId();
    const responseId = createId();
    const responsePartId = createId();

    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: [`/thread/${threadId}`],
      }),
      context: {
        queryClient,
        chatStore,
      },
      Wrap: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <ChatContext.Provider value={chatStore}>
            {children}
          </ChatContext.Provider>
        </QueryClientProvider>
      ),
    });

    await router.load();

    const screen = await render(<RouterProvider router={router} />);

    expect(router.state.location.pathname).toBe(`/thread/${threadId}`);

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

    await vi.waitFor(() => {
      expect(
        screen.container.querySelector("[data-sender='user']"),
        "should have the user message",
      ).toHaveTextContent("Kako se zoveš?");

      expect(
        screen.container.querySelector("[data-sender='llm']"),
        "should have the llm message",
      ).toHaveTextContent("Paul Atreid, knez Arrakisa");
    });

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
});
