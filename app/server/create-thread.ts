import { sql } from "drizzle-orm";
import type { AppLoadContext } from "react-router";

export async function createThreadIfNotExists(
  ctx: AppLoadContext,
  threadId: string,
  userId: string,
) {
  return ctx.db.run(sql`INSERT INTO
        thread (id, title, owner)
        VALUES (${threadId}, 'New thread', ${userId})
        ON CONFLICT DO NOTHING
    `);
}
