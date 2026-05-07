import { createId } from "@paralleldrive/cuid2";
import { APICallError, simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChunkAggregator } from "~/server/llm/chunk-aggregator";
import type { WsMessage } from "~/store/ws-message";

type LanguageModelV3StreamPart =
  Awaited<
    ReturnType<MockLanguageModelV3["doStream"]>
  >["stream"] extends ReadableStream<infer T>
    ? T
    : never;

const { selectModelMock, stepCountIs } = vi.hoisted(() => ({
  selectModelMock: vi.fn(),
  stepCountIs: vi.fn().mockReturnValue(() => true),
}));

vi.mock("~/server/model-picker.server", () => ({
  selectModel: selectModelMock,
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  stepCountIs,
}));

describe("websocket communication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(ChunkAggregator.prototype, "hasReachedLimit").mockReturnValue(
      true,
    );
  });

  it("should send text chunks and a finish message", async () => {
    mockTextOnlyGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    let stub = env.SESSION_DO.get(id);

    const response = await stub.fetch("http://do.test/ws", {
      headers: {
        Upgrade: "websocket",
      },
    });
    const ws = response.webSocket!;
    expect(ws).toBeDefined();

    ws.accept();

    const messagesPromise = nextMessages(ws);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const messages = await messagesPromise;
    expect(messages).toHaveLength(4);
    const payloads: WsMessage[] = messages.map((e) => JSON.parse(e.data));

    expect(payloads, "should contain the finished message").toContainEqual(
      expect.objectContaining({
        type: "message-finished",
        model: "test",
        status: "done",
        messageAttachemts: [],
        sender: "llm",
      }) satisfies WsMessage,
    );
  }, 30_000);

  it("should send text chunks", async () => {
    mockTextOnlyGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    let stub = env.SESSION_DO.get(id);

    const response = await stub.fetch("http://do.test/ws", {
      headers: {
        Upgrade: "websocket",
      },
    });
    const ws = response.webSocket!;
    expect(ws).toBeDefined();

    ws.accept();

    const messagesPromise = nextMessages(ws);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const messages = await messagesPromise;
    expect(messages).toHaveLength(4);
    const payloads: WsMessage[] = messages.map((e) => JSON.parse(e.data));

    expect(payloads).toEqual([
      expect.objectContaining({
        type: "text",
        content: "Hello",
      }),
      expect.objectContaining({
        type: "text",
        content: ", ",
      }),
      expect.objectContaining({
        type: "text",
        content: "world!",
      }),
      expect.objectContaining({
        type: "message-finished",
        model: "test",
        status: "done",
        messageAttachemts: [],
        sender: "llm",
      }),
    ] satisfies WsMessage[]);

    const rawIds = payloads
      .filter((p) => p.type !== "message-finished")
      .map(
        (p) =>
          // @ts-expect-error all have ids
          p["id"],
      );
    const partIds = new Set(rawIds);
    expect(partIds, "All parts should the same id").toHaveLength(1);
    expect(rawIds, "All parts should have an id").toHaveLength(3);
  }, 30_000);

  it("should send text-reasoning-text chunks", async () => {
    mockTextAndResoningGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    let stub = env.SESSION_DO.get(id);

    const response = await stub.fetch("http://do.test/ws", {
      headers: {
        Upgrade: "websocket",
      },
    });
    const ws = response.webSocket!;
    expect(ws).toBeDefined();

    ws.accept();

    const messagesPromise = nextMessages(ws);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const messages = await messagesPromise;
    expect(messages).toHaveLength(9);
    const payloads: WsMessage[] = messages.map((e) => JSON.parse(e.data));

    const rawIds = payloads
      .filter((p) => p.type !== "message-finished")
      .map(
        (p) =>
          // @ts-expect-error all have ids
          p["id"],
      );
    const partIds = new Set(rawIds);
    expect(partIds, "should have three distinct message parts").toHaveLength(3);
    expect(rawIds, "All parts should have an id").toHaveLength(8);

    expect(payloads).toEqual([
      expect.objectContaining({
        type: "text",
        content: "Hello",
      }),
      expect.objectContaining({
        type: "text",
        content: ", ",
      }),
      expect.objectContaining({
        type: "text",
        content: "world!",
      }),
      expect.objectContaining({
        type: "reasoning",
        content: "This is a reasoning message",
      }),
      expect.objectContaining({
        type: "reasoning",
        content: "This is a continuation of the reasoning message",
      }),
      expect.objectContaining({
        type: "text",
        content: "Pozdrav",
      }),
      expect.objectContaining({
        type: "text",
        content: ", ",
      }),
      expect.objectContaining({
        type: "text",
        content: "svijete!",
      }),
      expect.objectContaining({
        type: "message-finished",
        model: "test",
        status: "done",
        messageAttachemts: [],
        sender: "llm",
      }),
    ] satisfies WsMessage[]);
  }, 30_000);

  it("should send text and tool chunks", async () => {
    mockWebSearchGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    let stub = env.SESSION_DO.get(id);

    const response = await stub.fetch("http://do.test/ws", {
      headers: {
        Upgrade: "websocket",
      },
    });
    const ws = response.webSocket!;
    expect(ws).toBeDefined();

    ws.accept();

    const messagesPromise = nextMessages(ws);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const messages = await messagesPromise;
    const payloads: WsMessage[] = messages.map((e) => JSON.parse(e.data));
    expect(messages).toHaveLength(6);

    const rawIds = payloads
      .filter((p) => p.type !== "message-finished")
      .map(
        (p) =>
          // @ts-expect-error all have ids
          p["id"],
      );
    const partIds = new Set(rawIds);
    expect(partIds, "should have three distinct message parts").toHaveLength(3);
    expect(rawIds, "All parts should have an id").toHaveLength(5);

    expect(payloads).toEqual([
      expect.objectContaining({
        type: "text",
        content: "Hello",
      }),
      expect.objectContaining({
        type: "text",
        content: ", ",
      }),
      expect.objectContaining({
        type: "text",
        content: "world!",
      }),

      expect.objectContaining({
        type: "web-search",
        search: ["What is a fedaykin?"],
        results: [],
        id: "search",
      } satisfies WsMessage),
      expect.objectContaining({
        type: "web-fetch",
        search: ["http://dune.arakis"],
        results: [],
        id: "fetch",
      } satisfies WsMessage),

      expect.objectContaining({
        type: "message-finished",
        model: "test",
        status: "done",
        messageAttachemts: [],
        sender: "llm",
        id: "llmMessageId",
        textContent: null,
      } satisfies Partial<WsMessage>),
    ] satisfies WsMessage[]);
  }, 30_000);

  it("should include final persisted parts in the finished message", async () => {
    mockTextAndResoningGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    const response = await stub.fetch("http://do.test/ws", {
      headers: {
        Upgrade: "websocket",
      },
    });
    const ws = response.webSocket!;
    ws.accept();

    const messagesPromise = nextMessages(ws);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const messages = await messagesPromise;
    const payloads: WsMessage[] = messages.map((e) => JSON.parse(e.data));
    const finished = payloads.find((p) => p.type === "message-finished");

    expect(finished).toEqual(
      expect.objectContaining({
        id: "llmMessageId",
        type: "message-finished",
        parts: [
          expect.objectContaining({
            type: "text",
            textContent: { type: "text", content: "Hello, world!" },
          }),
          expect.objectContaining({
            type: "reasoning",
            textContent: {
              type: "reasoning",
              content:
                "This is a reasoning messageThis is a continuation of the reasoning message",
            },
          }),
          expect.objectContaining({
            type: "text",
            textContent: { type: "text", content: "Pozdrav, svijete!" },
          }),
        ],
      } satisfies Partial<WsMessage>),
    );
  }, 30_000);

  it("should send and persist error parts", async () => {
    mockErrorGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);
    const ws = await openWebSocket(stub);
    const messagesPromise = nextMessages(ws);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const messages = await messagesPromise;
    const payloads: WsMessage[] = messages.map((e) => JSON.parse(e.data));
    const text = payloads.find((p) => p.type === "text");
    const error = payloads.find((p) => p.type === "error");
    const finished = payloads.find((p) => p.type === "message-finished");

    expect(text).toEqual(
      expect.objectContaining({
        type: "text",
        content: "Partial answer",
      } satisfies Partial<WsMessage>),
    );
    expect(error).toEqual(
      expect.objectContaining({
        type: "error",
        content: "The model overloaded.",
      } satisfies Partial<WsMessage>),
    );
    expect(text).toHaveProperty("id");
    expect(error).toHaveProperty("id");
    if (text && "id" in text && error && "id" in error) {
      expect(error.id).not.toBe(text.id);
    }
    expect(finished).toEqual(
      expect.objectContaining({
        type: "message-finished",
        parts: [
          expect.objectContaining({
            type: "text",
            textContent: { type: "text", content: "Partial answer" },
          }),
          expect.objectContaining({
            type: "error",
            textContent: {
              type: "error",
              content: "The model overloaded.",
            },
          }),
        ],
      } satisfies Partial<WsMessage>),
    );
  }, 30_000);

  it("should broadcast chunks to multiple websockets", async () => {
    mockTextOnlyGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    const ws1 = await openWebSocket(stub);
    const ws2 = await openWebSocket(stub);
    const messagesPromise1 = nextMessages(ws1);
    const messagesPromise2 = nextMessages(ws2);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const [messages1, messages2] = await Promise.all([
      messagesPromise1,
      messagesPromise2,
    ]);
    const payloads1: WsMessage[] = messages1.map((e) => JSON.parse(e.data));
    const payloads2: WsMessage[] = messages2.map((e) => JSON.parse(e.data));

    expect(payloads1).toHaveLength(4);
    expect(payloads2).toEqual(payloads1);
  }, 30_000);

  it("should send streaming-done when stopped", async () => {
    mockSlowTextGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);
    const ws = await openWebSocket(stub);
    const messagesPromise = nextMessages(ws, 500);

    const sendPromise = stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    ws.send(JSON.stringify("stop"));

    await sendPromise;
    const messages = await messagesPromise;
    const payloads: WsMessage[] = messages.map((e) => JSON.parse(e.data));

    expect(payloads).toContainEqual({ type: "streaming-done" });
  }, 30_000);
});

function mockTextOnlyGeneration() {
  selectModelMock.mockImplementation(() => createTextOnlyModel());
}

function mockTextAndResoningGeneration() {
  selectModelMock.mockImplementation(() => createTextAndReasoningModel());
}

function mockWebSearchGeneration() {
  selectModelMock.mockImplementation(() => createTextAndToolModel());
}

function mockSlowTextGeneration() {
  selectModelMock.mockImplementation(() => createTextOnlyModel(50));
}

function mockErrorGeneration() {
  selectModelMock.mockImplementation(() => createErrorModel());
}

async function openWebSocket(stub: DurableObjectStub) {
  const response = await stub.fetch("http://do.test/ws", {
    headers: {
      Upgrade: "websocket",
    },
  });
  const ws = response.webSocket!;
  expect(ws).toBeDefined();
  ws.accept();
  return ws;
}

function nextMessages(ws: WebSocket, timeoutMs = 3000) {
  let resolved = false;
  return new Promise<MessageEvent[]>((resolve) => {
    const messages: MessageEvent[] = [];

    setTimeout(() => {
      if (!resolved) {
        resolve(messages);
        resolved = true;
        ws.removeEventListener("message", listener);
      }
    }, timeoutMs);

    const listener = (event: MessageEvent) => {
      messages.push(event);
    };

    ws.addEventListener("message", listener);
  });
}

function createTextOnlyModel(chunkDelayInMs?: number) {
  return new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: "text", text: "Hello, world chat" }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: 20,
          text: 20,
          reasoning: undefined,
        },
      },
      warnings: [],
    },
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs,
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Hello" },
          { type: "text-delta", id: "text-1", delta: ", " },
          { type: "text-delta", id: "text-1", delta: "world!" },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: {
                total: 3,
                noCache: 3,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: {
                total: 10,
                text: 10,
                reasoning: undefined,
              },
            },
          },
        ],
      }),
    }),
  });
}

function createTextAndReasoningModel() {
  return new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: "text", text: "Hello, world chat" }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: 20,
          text: 20,
          reasoning: undefined,
        },
      },
      warnings: [],
    },
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Hello" },
          { type: "text-delta", id: "text-1", delta: ", " },
          { type: "text-delta", id: "text-1", delta: "world!" },
          { type: "text-end", id: "text-1" },
          { type: "reasoning-start", id: "reasoning-1" },
          {
            type: "reasoning-delta",
            id: "reasoning-1",
            delta: "This is a reasoning message",
          },
          {
            type: "reasoning-delta",
            id: "reasoning-1",
            delta: "This is a continuation of the reasoning message",
          },
          { type: "reasoning-end", id: "reasoning-1" },
          { type: "text-start", id: "text-2" },
          { type: "text-delta", id: "text-2", delta: "Pozdrav" },
          { type: "text-delta", id: "text-2", delta: ", " },
          { type: "text-delta", id: "text-2", delta: "svijete!" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: {
                total: 3,
                noCache: 3,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: {
                total: 10,
                text: 10,
                reasoning: undefined,
              },
            },
          },
        ],
      }),
    }),
  });
}

function createTextAndToolModel() {
  let streamCallCount = 0;
  return new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: "text", text: "Hello, world chat" }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: 20,
          text: 20,
          reasoning: undefined,
        },
      },
      warnings: [],
    },
    doStream: async () => {
      streamCallCount += 1;
      const chunks: LanguageModelV3StreamPart[] = [
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "Hello" },
        { type: "text-delta", id: "text-1", delta: ", " },
        { type: "text-delta", id: "text-1", delta: "world!" },
        { type: "text-end", id: "text-1" },
      ];

      if (streamCallCount === 1) {
        chunks.push(
          {
            type: "tool-call" as const,
            toolCallId: "search",
            toolName: "websearch",
            input: JSON.stringify({ query: "What is a fedaykin?" }),
          },
          {
            type: "tool-call" as const,
            toolCallId: "fetch",
            toolName: "webfetch",
            input: JSON.stringify({ urls: ["http://dune.arakis"] }),
          },
        );
      }

      chunks.push({
        type: "finish",
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: {
            total: 3,
            noCache: 3,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: {
            total: 10,
            text: 10,
            reasoning: undefined,
          },
        },
      });

      return {
        stream: simulateReadableStream({
          chunks,
        }),
      };
    },
  });
}

function createErrorModel() {
  return new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: "text", text: "Partial answer" }],
      finishReason: { unified: "error", raw: undefined },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: 20,
          text: 20,
          reasoning: undefined,
        },
      },
      warnings: [],
    },
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Partial answer" },
          { type: "text-end", id: "text-1" },
          {
            type: "error",
            error: new APICallError({
              message: "The model overloaded.",
              url: "https://llm.test",
              requestBodyValues: {},
              responseBody: JSON.stringify({
                error: { message: "The model overloaded." },
              }),
            }),
          },
          {
            type: "finish",
            finishReason: { unified: "error", raw: undefined },
            usage: {
              inputTokens: {
                total: 3,
                noCache: 3,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: {
                total: 10,
                text: 10,
                reasoning: undefined,
              },
            },
          },
        ],
      }),
    }),
  });
}
