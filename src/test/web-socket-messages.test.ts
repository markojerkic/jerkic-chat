import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { ChunkAggregator } from "~/server/llm/chunk-aggregator";

const { selectModelMock } = vi.hoisted(() => ({
  selectModelMock: vi.fn(),
}));

vi.mock("~/server/model-picker.server", () => ({
  selectModel: selectModelMock,
}));

describe("websocket communication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(ChunkAggregator.prototype, "hasReachedLimit").mockReturnValue(
      true,
    );
  });

  it("should send text chunks", async () => {
    mockTextOnlyGeneration();
    const id = env.SESSION_DO.idFromName("test-counter");
    let stub = env.SESSION_DO.get(id);

    const response = await stub.fetch("http://do.test/ws", {
      headers: {
        Upgrade: "websocket",
      },
    });
    const ws = response.webSocket!;
    expect(ws).toBeDefined();

    ws.accept();

    const messagesPromise = nextMessages(ws, 3);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const messages = await messagesPromise;
    expect(messages).toHaveLength(3);
    const payloads: WsMessage[] = messages.map((e) => JSON.parse(e.data));

    expect(payloads).toEqual([
      expect.objectContaining({
        type: "text-delta",
        delta: "Hello",
      }),
      expect.objectContaining({
        type: "text-delta",
        delta: ", ",
      }),
      expect.objectContaining({
        type: "text-delta",
        delta: "world!",
      }),
    ] satisfies WsMessage[]);

    const rawIds = payloads.map(
      (p) =>
        // @ts-expect-error all have ids
        p["id"],
    );
    const partIds = new Set(rawIds);
    expect(partIds, "All parts should the same id").toHaveLength(1);
    expect(rawIds, "All parts should have an id").toHaveLength(3);
  });

  it("should send text-reasoning-text chunks", async () => {
    mockTextAndResoningGeneration();
    const id = env.SESSION_DO.idFromName("test-counter-2");
    let stub = env.SESSION_DO.get(id);

    const response = await stub.fetch("http://do.test/ws", {
      headers: {
        Upgrade: "websocket",
      },
    });
    const ws = response.webSocket!;
    expect(ws).toBeDefined();

    ws.accept();

    const messagesPromise = nextMessages(ws, 8);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const messages = await messagesPromise;
    expect(messages).toHaveLength(8);
    const payloads: WsMessage[] = messages.map((e) => JSON.parse(e.data));

    const expectedChunks = [
      {
        type: "text-delta",
        delta: "Hello",
      },
      {
        type: "text-delta",
      },
      {
        type: "text-delta",
        model: "test",
      },
      {
        type: "reasoning",
        delta: "This is a reasoning message",
      },
      {
        type: "reasoning",
        delta: "This is a continuation of the reasoning message",
      },
      {
        type: "text-delta",
        delta: "Pozdrav",
      },
      {
        type: "text-delta",
        delta: ", ",
      },
      {
        type: "text-delta",
        delta: "svijete!",
      },
    ];
    const rawIds = payloads.map(
      (p) =>
        // @ts-expect-error all have ids
        p["id"],
    );
    const partIds = new Set(rawIds);
    expect(partIds, "should have three distinct message parts").toHaveLength(3);
    expect(rawIds, "All parts should have an id").toHaveLength(8);

    expect(payloads).toEqual([
      expectedChunks.map((chunk) => expect.objectContaining(chunk)),
    ]);
  });
}, 30_000);

function mockTextOnlyGeneration() {
  selectModelMock.mockImplementation(() => createTextOnlyModel());
}

function mockTextAndResoningGeneration() {
  selectModelMock.mockImplementation(() => createTextAndReasoningModel());
}

function nextMessages(ws: WebSocket, count: number) {
  return new Promise<MessageEvent[]>((resolve) => {
    const messages: MessageEvent[] = [];

    const listener = (event: MessageEvent) => {
      messages.push(event);

      if (messages.length === count) {
        ws.removeEventListener("message", listener);
        resolve(messages);
      }
    };

    ws.addEventListener("message", listener);
  });
}

function createTextOnlyModel() {
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
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            logprobs: undefined,
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
            logprobs: undefined,
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
