import { createId } from "@paralleldrive/cuid2";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { describe, expect, it, vi } from "vitest";
import * as sessionSchema from "~/db/session/schema";
import * as userSchema from "~/db/user/schema";
import { forkThread } from "~/server/llm.server";

const { getProviderMock, selectModelMock } = vi.hoisted(() => ({
  getProviderMock: vi.fn(() => ({ imageModel: vi.fn() })),
  selectModelMock: vi.fn(),
}));

vi.mock("~/server/model-picker.server", () => ({
  getProvider: getProviderMock,
  selectModel: selectModelMock,
}));

describe("forkThread", () => {
  it("creates a forked user thread and copies chat messages through the target message", async () => {
    const userId = createId();
    const threadId = createId();
    const newThreadId = createId();
    const createdAt = new Date(2026, 4, 15, 12, 0, 0);

    await createUserThread({ userId, threadId, title: "Fedaykin" });
    await createChatMessages({ userId, threadId, createdAt });

    await forkThread({
      userId,
      threadId,
      newThreadId,
      targetMessageId: "message-2",
    });

    const user = env.USER_DATA_DO.get(env.USER_DATA_DO.idFromName(userId));
    await runInDurableObject(user, async (_instance, state) => {
      const db = drizzle(state.storage, { schema: userSchema, logger: false });
      const threads = await db.query.thread.findMany({
        orderBy: ({ id }, { asc }) => asc(id),
      });

      expect(threads).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: threadId,
            title: "Fedaykin",
            forked: false,
          }),
          expect.objectContaining({
            id: newThreadId,
            title: "Fedaykin",
            forked: true,
          }),
        ]),
      );
    });

    const targetSession = env.SESSION_DO.get(
      env.SESSION_DO.idFromName(`${userId}_${newThreadId}`),
    );

    const targetMessages = await targetSession.getMessages();
    expect(targetMessages.map((message) => message.id)).toEqual([
      "message-1",
      "message-2",
    ]);
    expect(targetMessages[1].parts.map((part) => part.id)).toEqual(["part-1"]);
  });

  it("replaces existing target chat data with the source dump", async () => {
    const userId = createId();
    const threadId = createId();
    const newThreadId = createId();

    await createUserThread({ userId, threadId, title: "Source" });
    await createChatMessages({
      userId,
      threadId,
      createdAt: new Date(2026, 4, 15, 12, 0, 0),
    });
    await createTargetOnlyMessage({ userId, threadId: newThreadId });

    await forkThread({
      userId,
      threadId,
      newThreadId,
      targetMessageId: "message-2",
    });

    const targetSession = env.SESSION_DO.get(
      env.SESSION_DO.idFromName(`${userId}_${newThreadId}`),
    );
    const targetMessages = await targetSession.getMessages();

    expect(targetMessages.map((message) => message.id)).toEqual([
      "message-1",
      "message-2",
    ]);
    expect(
      targetMessages.some((message) => message.id === "target-only-message"),
    ).toBe(false);
  });

  it("leaves the source chat unchanged", async () => {
    const userId = createId();
    const threadId = createId();
    const newThreadId = createId();
    const createdAt = new Date(2026, 4, 15, 12, 0, 0);

    await createUserThread({ userId, threadId, title: "Unchanged" });
    await createChatMessages({ userId, threadId, createdAt });

    const sourceSession = env.SESSION_DO.get(
      env.SESSION_DO.idFromName(`${userId}_${threadId}`),
    );
    const before = await sourceSession.getMessages();

    await forkThread({
      userId,
      threadId,
      newThreadId,
      targetMessageId: "message-2",
    });

    await expect(sourceSession.getMessages()).resolves.toEqual(before);
  });
});

async function createUserThread({
  userId,
  threadId,
  title,
}: {
  userId: string;
  threadId: string;
  title: string;
}) {
  const user = env.USER_DATA_DO.get(env.USER_DATA_DO.idFromName(userId));

  await runInDurableObject(user, async (_instance, state) => {
    const db = drizzle(state.storage, { schema: userSchema, logger: false });
    await db.insert(userSchema.thread).values({
      id: threadId,
      title,
      forked: false,
    });
  });
}

async function createChatMessages({
  userId,
  threadId,
  createdAt,
}: {
  userId: string;
  threadId: string;
  createdAt: Date;
}) {
  const session = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${threadId}`),
  );

  await runInDurableObject(session, async (_instance, state) => {
    const db = drizzle(state.storage, { schema: sessionSchema, logger: false });
    await db.insert(sessionSchema.message).values([
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
      {
        id: "message-3",
        model: "arrakis/fedaykin",
        sender: "user",
        status: "done",
        order: 0,
        createdAt: new Date(createdAt.getTime() + 2),
        textContent: "Tell me more.",
      },
      {
        id: "message-4",
        model: "arrakis/fedaykin",
        sender: "llm",
        status: "done",
        order: 1,
        createdAt: new Date(createdAt.getTime() + 3),
      },
    ]);
    await db.insert(sessionSchema.messagePart).values({
      id: "part-1",
      messageId: "message-2",
      type: "text",
      createdAt,
      textContent: {
        type: "text",
        content: "A fedaykin is an Arrakis warrior.",
      },
    });
  });
}

async function createTargetOnlyMessage({
  userId,
  threadId,
}: {
  userId: string;
  threadId: string;
}) {
  const session = env.SESSION_DO.get(
    env.SESSION_DO.idFromName(`${userId}_${threadId}`),
  );

  await runInDurableObject(session, async (_instance, state) => {
    const db = drizzle(state.storage, { schema: sessionSchema, logger: false });
    await db.insert(sessionSchema.message).values({
      id: "target-only-message",
      model: "harkonnen/baron",
      sender: "user",
      status: "done",
      order: 0,
      textContent: "This should be replaced.",
    });
  });
}
