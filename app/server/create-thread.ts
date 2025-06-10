import { sql } from "drizzle-orm";
import type { AppLoadContext } from "react-router";

export async function createThreadIfNotExists(
  ctx: AppLoadContext,
  threadId: string,
  userId: string,
  title: string,
) {
  return ctx.db.run(sql`INSERT INTO
        thread (id, title, owner)
        VALUES (${threadId}, ${title}, ${userId})
        ON CONFLICT DO NOTHING
    `);
}
