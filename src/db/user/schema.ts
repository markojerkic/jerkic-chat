import { createId } from "@paralleldrive/cuid2";
import { desc } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const thread = sqliteTable(
  "thread",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => createId()),
    title: text(),
    createdAt: integer({ mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer({ mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    forked: integer({ mode: "boolean" }).default(false),
  },
  (t) => [index("idx_created_at_desc").on(desc(t.updatedAt))],
);
export type Thread = typeof thread.$inferSelect;
export type ThreadInput = typeof thread.$inferInsert;
