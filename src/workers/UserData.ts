import { DurableObject } from "cloudflare:workers";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
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
      try {
        await migrate(this.db, migrations);
      } catch (e) {
        console.log("error in user data", e);
      }
    });
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
}
