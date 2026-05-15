import { createId } from "@paralleldrive/cuid2";
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

describe("dump and restore chat database", () => {
  it("restores dumped messages and parts into another chat session", async () => {
    const source = env.SESSION_DO.get(env.SESSION_DO.idFromName(createId()));
    const target = env.SESSION_DO.get(env.SESSION_DO.idFromName(createId()));
    const createdAt = new Date(2026, 4, 15, 11, 30, 0);

    await runInDurableObject(source, async (instance, state) => {
      expect(instance).toBeInstanceOf(ChatSession);

      const db = drizzle(state.storage, { schema, logger: false });
      await db.insert(schema.message).values([
        {
          id: "message-1",
          model: "arrakis/fedaykin",
          sender: "user",
          status: "done",
          order: 0,
          createdAt,
          textContent: "What is a fedaykin?",
        },
        {
          id: "message-2",
          model: "arrakis/fedaykin",
          sender: "llm",
          status: "done",
          order: 1,
          createdAt: new Date(createdAt.getTime() + 1),
        },
      ]);
      await db.insert(schema.messagePart).values([
        {
          id: "part-1",
          messageId: "message-2",
          type: "reasoning",
          createdAt,
          textContent: {
            type: "reasoning",
            title: "Thinking",
            content: "Desert warriors are relevant.",
          },
        },
        {
          id: "part-2",
          messageId: "message-2",
          type: "text",
          createdAt: new Date(createdAt.getTime() + 1),
          textContent: {
            type: "text",
            content: "A fedaykin is an Arrakis warrior.",
          },
        },
      ]);
    });

    const statements = await source.dumpDatabase();
    await target.restoreDatabase(statements);

    await expect(target.getMessages()).resolves.toEqual(
      await source.getMessages(),
    );
  });

  it("escapes quotes and semicolons in dumped text and json values", async () => {
    const source = env.SESSION_DO.get(env.SESSION_DO.idFromName(createId()));
    const target = env.SESSION_DO.get(env.SESSION_DO.idFromName(createId()));

    await runInDurableObject(source, async (_instance, state) => {
      const db = drizzle(state.storage, { schema, logger: false });
      await db.insert(schema.message).values({
        id: "message-with-quotes",
        model: "guild/navigator",
        sender: "llm",
        status: "done",
        order: null,
        createdAt: new Date(2026, 4, 15, 11, 30, 0),
        textContent: "It's safe; DROP TABLE message; --",
      });
      await db.insert(schema.messagePart).values({
        id: "part-with-quotes",
        messageId: "message-with-quotes",
        type: "text",
        textContent: {
          type: "text",
          content: "Paul's answer; still just text",
        },
      });
    });

    await target.restoreDatabase(await source.dumpDatabase());

    const [message] = await target.getMessages();
    expect(message.textContent).toBe("It's safe; DROP TABLE message; --");
    expect(message.order).toBeNull();
    expect(message.parts[0].textContent).toEqual({
      type: "text",
      content: "Paul's answer; still just text",
    });
  });

  it("replaces existing target data when restoring", async () => {
    const source = env.SESSION_DO.get(env.SESSION_DO.idFromName(createId()));
    const target = env.SESSION_DO.get(env.SESSION_DO.idFromName(createId()));

    await runInDurableObject(source, async (_instance, state) => {
      const db = drizzle(state.storage, { schema, logger: false });
      await db.insert(schema.message).values({
        id: "source-message",
        model: "atreides/duke",
        sender: "user",
        status: "done",
        order: 0,
        createdAt: new Date(2026, 4, 15, 11, 30, 0),
        textContent: "Source message",
      });
    });
    await runInDurableObject(target, async (_instance, state) => {
      const db = drizzle(state.storage, { schema, logger: false });
      await db.insert(schema.message).values({
        id: "target-message",
        model: "harkonnen/baron",
        sender: "user",
        status: "done",
        order: 0,
        createdAt: new Date(2026, 4, 15, 11, 30, 0),
        textContent: "Existing target message",
      });
    });

    await target.restoreDatabase(await source.dumpDatabase());

    const messages = await target.getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe("source-message");
  });
});
