import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { selectModel } from "~/server/model-picker.server";

vi.mock("~/server/model-picker.server", () => ({
  selectModel: vi.fn(() => {
    return new MockLanguageModelV3({
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
  }),
}));

describe("Session Durable Object smoke test", () => {
  it("should start with no messages", async () => {
    const id = env.SESSION_DO.idFromName("test-counter");
    const stub = env.SESSION_DO.get(id);

    // Call RPC methods directly on the stub
    const messages = await stub.getMessages();
    expect(messages).toHaveLength(0);
  });

  it("should override model selection", async () => {
    const model = selectModel("test");

    expect(model).toBeDefined();
    expect(model).toBeInstanceOf(MockLanguageModelV3);
  });
}, 30_000);
