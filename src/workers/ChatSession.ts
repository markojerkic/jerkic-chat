import { DurableObject } from "cloudflare:workers";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

import migrations from "../db/session/drizzle/migrations";
import * as schema from "../db/session/schema";

export class MessagesDurableObject extends DurableObject<Env> {
  private db: DrizzleSqliteDODatabase<typeof schema>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.db = drizzle(ctx.storage, { schema, logger: false });

    ctx.blockConcurrencyWhile(async () => {
      await migrate(this.db, migrations);
    });
  }
}
