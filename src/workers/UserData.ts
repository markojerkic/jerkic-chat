import { generateText } from "ai";
import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { selectModel } from "~/server/model-picker.server";
import migrations from "../db/user/drizzle/migrations";
import type { Thread } from "../db/user/schema";
import * as schema from "../db/user/schema";

export type GetThreadsResult = {
  threads: Thread[];
  threadCount: number;
};

export class UserData extends DurableObject<Env> {
  private db: DrizzleSqliteDODatabase<typeof schema>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.db = drizzle(ctx.storage, { schema, logger: false });

    ctx.blockConcurrencyWhile(async () => {
      await migrate(this.db, migrations);
    });
  }

  public async createThread(
    promt: string,
    threadId: string,
  ): Promise<{ threadId: string; title: string } | undefined> {
    const exists = await this.threadExists(threadId);
    if (exists) {
      return;
    }
    await this.db.insert(schema.thread).values({ id: threadId });

    const llmModel = selectModel(this.env, "openai/gpt-5-nano");

    const threadNameResult = await generateText({
      model: llmModel,
      system:
        "Generate a very short title for a chat thread from the user's first message. The title must be in the same language as the user's message. Return only the title, with no quotes, punctuation decoration, or explanation. Keep it under 5 words and prefer concrete topic words over generic labels.",
      prompt: `Create a short chat thread title for this first user message:\n\n${promt}`,
    });

    await this.db
      .update(schema.thread)
      .set({
        title: threadNameResult.text,
      })
      .where(eq(schema.thread.id, threadId));
    return { threadId, title: threadNameResult.text };
  }

  public async getThreadTitle(threadId: string): Promise<string | undefined> {
    return await this.db.query.thread
      .findFirst({
        columns: {
          title: true,
        },
        where: ({ id }, { eq }) => eq(id, threadId),
      })
      .then((res) => res?.title ?? undefined);
  }

  public async getThreads(
    page: number = 0,
    size: number = 20,
  ): Promise<GetThreadsResult> {
    const threadCountPromise = this.db.$count(schema.thread);

    const threadsPromise = this.db.query.thread.findMany({
      limit: size,
      offset: page * size,
      orderBy: ({ updatedAt }, { desc }) => desc(updatedAt),
    });

    const [threads, threadCount] = await Promise.all([
      threadsPromise,
      threadCountPromise,
    ]);

    return { threads, threadCount };
  }

  private async threadExists(threadId: string) {
    const row = await this.db.query.thread.findFirst({
      where: (thread, { eq }) => eq(thread.id, threadId),
      columns: { id: true },
    });

    return row !== undefined;
  }
}
