import { createId } from "@paralleldrive/cuid2";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { describe, expect, it, vi } from "vitest";
import { ChatSession } from "~/app";
import * as schema from "../db/session/schema";

const { getProviderMock, selectModelMock } = vi.hoisted(() => ({
  getProviderMock: vi.fn(() => ({ imageModel: vi.fn() })),
  selectModelMock: vi.fn(),
}));

vi.mock("~/server/model-picker.server", () => ({
  getProvider: getProviderMock,
  selectModel: selectModelMock,
}));

describe("retry message with different model", () => {
  it("should delete all messages after id inclusive", async () => {
    mockTextOnlyGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    await runInDurableObject(stub, async (instance, state) => {
      expect(instance).toBeInstanceOf(ChatSession);

      const db = drizzle(state.storage, { schema, logger: false });
      const createdAt = new Date(2026, 4, 7, 18, 29, 0);

      await db.insert(schema.message).values([
        {
          id: "message-1",
          model: "arrakis/feydakin",
          sender: "user",
          status: "done",
          order: 0,
          createdAt,
          textContent: "What is a fedaykin?",
        },
        {
          id: "message-2",
          model: "arrakis/feydakin",
          sender: "llm",
          status: "done",
          order: 1,
          createdAt: new Date(createdAt.getTime() + 1),
        },
        {
          id: "message-3",
          model: "arrakis/feydakin",
          sender: "user",
          status: "done",
          order: 0,
          createdAt: new Date(createdAt.getTime() + 2),
          textContent: "Who is a fedaykin?",
        },
        {
          id: "message-4",
          model: "arrakis/feydakin",
          sender: "llm",
          status: "done",
          order: 1,
          createdAt: new Date(createdAt.getTime() + 3),
        },
      ]);
    });
    await expect(
      stub.getMessages(),
      "Test has two messages",
    ).resolves.toHaveLength(4);

    await stub.retryMessage("message-2", "kwisatz/haderach");

    await vi.waitFor(async () => {
      const messages = await stub.getMessages();
      const retriedMessage = messages[1];

      expect(
        (retriedMessage?.parts[0]?.textContent as schema.TextMessagePart)
          ?.content,
      ).toBe("A fedaykin is an Arrakis warrior.");
    });

    const messages = await stub.getMessages();
    expect(messages).toHaveLength(2);
    const retriedMessage = messages[1];
    expect(retriedMessage?.id).not.toBe("message-2");
    expect(retriedMessage?.parts.length).toBe(1);
    expect(retriedMessage?.parts[0].type).toBe("text");
    expect(
      (retriedMessage?.parts[0].textContent as schema.TextMessagePart).content,
    ).toBe("A fedaykin is an Arrakis warrior.");
  }, 30_000);

  it("should not retry user messages", async () => {
    mockTextOnlyGeneration();
    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);

    await runInDurableObject(stub, async (instance, state) => {
      expect(instance).toBeInstanceOf(ChatSession);

      const db = drizzle(state.storage, { schema, logger: false });
      const createdAt = new Date(2026, 4, 7, 18, 29, 0);

      await db.insert(schema.message).values([
        {
          id: "message-1",
          model: "arrakis/feydakin",
          sender: "user",
          status: "done",
          order: 0,
          createdAt,
          textContent: "What is a fedaykin?",
        },
        {
          id: "message-2",
          model: "arrakis/feydakin",
          sender: "llm",
          status: "done",
          order: 1,
          createdAt: new Date(createdAt.getTime() + 1),
        },
      ]);
    });

    await stub.retryMessage("message-1", "kwisatz/haderach");

    const messages = await stub.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.id)).toEqual([
      "message-1",
      "message-2",
    ]);
  }, 30_000);

  it("should only return generated images referenced by message parts", async () => {
    const id = env.SESSION_DO.idFromName(createId());
    const stub = env.SESSION_DO.get(id);
    const imageKey = `tools/image/${createId()}`;
    const otherImageKey = `tools/image/${createId()}`;
    const imageBytes = new Uint8Array([1, 2, 3]);

    await env.upload_files.put(imageKey, imageBytes, {
      httpMetadata: { contentType: "image/png" },
    });
    await env.upload_files.put(otherImageKey, imageBytes, {
      httpMetadata: { contentType: "image/png" },
    });

    await runInDurableObject(stub, async (instance, state) => {
      expect(instance).toBeInstanceOf(ChatSession);

      const db = drizzle(state.storage, { schema, logger: false });
      const createdAt = new Date(2026, 4, 7, 18, 29, 0);

      await db.insert(schema.message).values({
        id: "message-1",
        model: "arrakis/feydakin",
        sender: "llm",
        status: "done",
        order: 0,
        createdAt,
      });
      await db.insert(schema.messagePart).values({
        id: "part-1",
        messageId: "message-1",
        type: "text",
        textContent: { type: "text", content: imageKey },
      });
    });

    const image = await stub.getGeneratedImage("message-1", imageKey);
    expect(image?.contentType).toBe("image/png");
    expect(Array.from(new Uint8Array(image!.buffer))).toEqual([1, 2, 3]);

    await expect(
      stub.getGeneratedImage("message-1", otherImageKey),
    ).resolves.toBeNull();
  });
});

function mockTextOnlyGeneration() {
  selectModelMock.mockImplementation(
    () =>
      new MockLanguageModelV3({
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
              { type: "text-delta", id: "text-1", delta: "A " },
              { type: "text-delta", id: "text-1", delta: "fedaykin " },
              { type: "text-delta", id: "text-1", delta: "is " },
              { type: "text-delta", id: "text-1", delta: "an " },
              { type: "text-delta", id: "text-1", delta: "Arrakis " },
              { type: "text-delta", id: "text-1", delta: "warrior." },
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
      }),
  );
}
