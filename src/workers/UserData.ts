import { DurableObject } from "cloudflare:workers";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import migrations from "../db/user/drizzle/migrations";
import * as schema from "../db/user/schema";

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

  public async getThreads(page: number = 0, size: number = 20) {
    const threadCount = this.db.$count(schema.thread);

    const threads = this.db.query.thread.findMany({
      limit: size,
      offset: page * size,
      orderBy: ({ updatedAt }, { desc }) => desc(updatedAt),
    });

    return Promise.all([threads, threadCount]).then(
      ([threads, threadCount]) => ({ threads, threadCount }),
    );
  }
}
