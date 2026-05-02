import { createId } from "@paralleldrive/cuid2";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    const messages = await stub.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe("sentMessageId");
    expect(messages[0].textContent).toBe("Hello, world!");
    expect(messages[0].sender).toBe("user");
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

    const llmResponseMessage = messages[1];
    expect(llmResponseMessage.parts).toHaveLength(1);
    expect(llmResponseMessage.parts[0].type).toBe("text");
    expect(llmResponseMessage.parts[0].textContent).toBe("Hello, world!");
  });

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
    expect(llmResponseMessage.parts[0].textContent).toBe("Hello, world!");
    expect(llmResponseMessage.parts[1].type).toBe("reasoning");
    expect(llmResponseMessage.parts[1].textContent).toBe(
      "This is a reasoning messageThis is a continuation of the reasoning message",
    );
    expect(llmResponseMessage.parts[2].type).toBe("text");
    expect(llmResponseMessage.parts[2].textContent).toBe("Hello, world!");
  }, 30_000);

  it("should override model selection", async () => {
    mockTextOnlyGeneration();

    const model = selectModel("test");

    expect(model).toBeDefined();
    expect(model).toBeInstanceOf(MockLanguageModelV3);
  }, 30_000);
});

function mockTextAndReasoningGeneration() {
  selectModelMock.mockImplementation(() => createTextAndReasoningModel());
}

function mockTextOnlyGeneration() {
  selectModelMock.mockImplementation(() => createTextOnlyModel());
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
