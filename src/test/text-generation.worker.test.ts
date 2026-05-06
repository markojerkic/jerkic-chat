import { createId } from "@paralleldrive/cuid2";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MessagePartContent } from "~/db/session/schema";
import { selectModel } from "~/server/model-picker.server";

const { selectModelMock } = vi.hoisted(() => ({
  selectModelMock: vi.fn(),
}));

vi.mock("~/server/model-picker.server", () => ({
  selectModel: selectModelMock,
}));

describe("generate text and save to db", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have only one text part", async () => {
    mockTextOnlyGeneration();

    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    // Call RPC methods directly on the stub
    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });
    let messages = await stub.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe("sentMessageId");
    expect(messages[0].textContent).toBe("Hello, world!");
    expect(messages[0].sender).toBe("user");
    expect(messages[0].parts).toHaveLength(0);
    expect(messages[1].id).toBe("llmMessageId");
    expect(messages[1].textContent).toBeNull();
    expect(messages[1].sender).toBe("llm");

    await runInDurableObject(stub, async (_instance, state) => {
      const rows = state.storage.sql
        .exec<{
          name: string;
          value: number;
        }>("SELECT * FROM messagePart")
        .toArray();

      expect(state.storage.sql.databaseSize).toBeGreaterThan(0);
      expect(rows).toHaveLength(1);
    });

    messages = await stub.getMessages();
    const llmResponseMessage = messages[1];
    expect(llmResponseMessage.parts).toHaveLength(1);
    expect(llmResponseMessage.parts[0].type).toBe("text");
    expect(llmResponseMessage.parts[0].textContent).toStrictEqual({
      type: "text",
      content: "Hello, world!",
    } satisfies MessagePartContent);
  });

  it("should save user and streaming llm placeholder immediately", async () => {
    mockSlowTextGeneration();

    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: "sentMessageId",
      llmMessageId: "llmMessageId",
      threadId: "threadId",
    });

    const messages = await stub.getMessages();

    expect(messages).toEqual([
      expect.objectContaining({
        id: "sentMessageId",
        sender: "user",
        textContent: "Hello, world!",
        model: "test",
        status: "done",
        order: 0,
        parts: [],
      }),
      expect.objectContaining({
        id: "llmMessageId",
        sender: "llm",
        textContent: null,
        model: "test",
        status: "streaming",
        order: 1,
      }),
    ]);

    await vi.waitFor(async () => {
      const doneMessages = await stub.getMessages();
      expect(doneMessages[1].status).toBe("done");
    });
  }, 30_000);

  it("should have two text parts, and one reasoning part", async () => {
    mockTextAndReasoningGeneration();

    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    // Call RPC methods directly on the stub
    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: createId(),
      llmMessageId: createId(),
      threadId: createId(),
    });
    await vi.waitFor(async () => {
      const messages = await stub.getMessages();

      expect(messages).toHaveLength(2);
      expect(messages[1].status).toBe("done");
      expect(messages[1].parts).toHaveLength(3);
    });

    const messages = await stub.getMessages();

    const llmResponseMessage = messages[1];
    expect(llmResponseMessage.parts).toHaveLength(3);
    expect(llmResponseMessage.parts[0].type).toBe("text");
    expect(llmResponseMessage.parts[0].textContent).toStrictEqual({
      type: "text",
      content: "Hello, world!",
    } satisfies MessagePartContent);
    expect(llmResponseMessage.parts[1].type).toBe("reasoning");
    expect(llmResponseMessage.parts[1].textContent).toStrictEqual({
      type: "reasoning",
      content:
        "This is a reasoning messageThis is a continuation of the reasoning message",
    } satisfies MessagePartContent);
    expect(llmResponseMessage.parts[2].type).toBe("text");
    expect(llmResponseMessage.parts[2].textContent).toStrictEqual({
      type: "text",
      content: "Hello, world!",
    } satisfies MessagePartContent);
  }, 30_000);

  it("should have a web search part", async () => {
    mockWebSearchGeneration();

    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    // Call RPC methods directly on the stub
    await stub.sendMessage("user", {
      q: "Hello, world!",
      model: "test",
      id: createId(),
      llmMessageId: createId(),
      threadId: createId(),
    });
    await vi.waitFor(
      async () => {
        const messages = await stub.getMessages();

        expect(messages).toHaveLength(2);
        expect(messages[1].status).toBe("done");
        expect(messages[1].parts).toHaveLength(2);
      },
      { timeout: 10_000 },
    );

    const messages = await stub.getMessages();

    const llmResponseMessage = messages[1];
    expect(llmResponseMessage.parts[0].type).toBe("web-search");
    expect(llmResponseMessage.parts[0].textContent).toStrictEqual({
      type: "web-search",
      search: ["What is a fedaykin?"],
      results: [],
    } satisfies MessagePartContent);

    expect(llmResponseMessage.parts[1].type).toBe("web-fetch");
    expect(llmResponseMessage.parts[1].textContent).toStrictEqual({
      type: "web-fetch",
      search: ["http://dune.arakis"],
      results: [],
    } satisfies MessagePartContent);
  }, 30_000);

  it("should override model selection", async () => {
    mockTextOnlyGeneration();

    const model = selectModel("test");

    expect(model).toBeDefined();
    expect(model).toBeInstanceOf(MockLanguageModelV3);
  }, 30_000);
});

describe("send previous messages to the model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send previous user and assistant text/reasoning plus current user message", async () => {
    const model = createTextAndReasoningModel();
    selectModelMock.mockReturnValue(model);
    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    await stub.sendMessage("user", {
      q: "First question",
      model: "test",
      id: "user-1",
      llmMessageId: "llm-1",
      threadId: "threadId",
    });
    await vi.waitFor(async () => {
      const messages = await stub.getMessages();
      expect(messages[1].status).toBe("done");
    });

    await stub.sendMessage("user", {
      q: "Second question",
      model: "test",
      id: "user-2",
      llmMessageId: "llm-2",
      threadId: "threadId",
    });

    await vi.waitFor(() => {
      expect(model.doStreamCalls).toHaveLength(2);
    });

    const prompt = model.doStreamCalls[1].prompt;
    expect(prompt).toEqual([
      expect.objectContaining({ role: "system" }),
      {
        role: "user",
        content: [{ type: "text", text: "First question" }],
      },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Hello, world!" },
          {
            type: "reasoning",
            text: "This is a reasoning messageThis is a continuation of the reasoning message",
          },
          { type: "text", text: "Hello, world!" },
        ],
      },
      {
        role: "user",
        content: [{ type: "text", text: "Second question" }],
      },
    ]);
    expect(JSON.stringify(prompt)).not.toContain("llm-2");
  }, 30_000);

  it("should convert previous web tools into model tool-call and tool-result messages", async () => {
    const model = createWebSearchModel();
    selectModelMock.mockReturnValue(model);
    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    await stub.sendMessage("user", {
      q: "Find fedaykin",
      model: "test",
      id: "user-1",
      llmMessageId: "llm-1",
      threadId: "threadId",
    });
    await vi.waitFor(async () => {
      const messages = await stub.getMessages();
      expect(messages[1].status).toBe("done");
      expect(messages[1].parts).toHaveLength(2);
    });

    await stub.sendMessage("user", {
      q: "Use the results",
      model: "test",
      id: "user-2",
      llmMessageId: "llm-2",
      threadId: "threadId",
    });

    await vi.waitFor(() => {
      expect(model.doStreamCalls.length).toBeGreaterThanOrEqual(2);
    });

    const prompt = model.doStreamCalls.at(-1)!.prompt;
    expect(prompt).toEqual([
      expect.objectContaining({ role: "system" }),
      {
        role: "user",
        content: [{ type: "text", text: "Find fedaykin" }],
      },
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "search",
            toolName: "websearch",
            input: { query: "What is a fedaykin?" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "search",
            toolName: "websearch",
            output: { type: "json", value: [] },
          },
        ],
      },
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "fetch",
            toolName: "webfetch",
            input: { urls: ["http://dune.arakis"] },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "fetch",
            toolName: "webfetch",
            output: { type: "json", value: [] },
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "text", text: "Use the results" }],
      },
    ]);
  }, 30_000);
});

function mockTextAndReasoningGeneration() {
  selectModelMock.mockImplementation(() => createTextAndReasoningModel());
}

function mockTextOnlyGeneration() {
  selectModelMock.mockImplementation(() => createTextOnlyModel());
}

function mockSlowTextGeneration() {
  selectModelMock.mockImplementation(() => createTextOnlyModel(50));
}

function mockWebSearchGeneration() {
  selectModelMock.mockImplementation(() => createWebSearchModel());
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
          { type: "text-delta", id: "text-2", delta: "Hello" },
          { type: "text-delta", id: "text-2", delta: ", " },
          { type: "text-delta", id: "text-2", delta: "world!" },
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

function createWebSearchModel() {
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
      const chunks = [];

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
        type: "finish" as const,
        finishReason: { unified: "stop" as const, raw: undefined },
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
      });

      return {
        stream: simulateReadableStream({
          chunks,
        }),
      };
    },
  });
}
