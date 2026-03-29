import { createId } from "@paralleldrive/cuid2";
import { desc } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const message = sqliteTable(
  "message",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => createId()),
    textContent: text(),
    sender: text({ enum: ["user", "llm"] }).notNull(),
    model: text().notNull(),
    createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
    status: text({
      enum: ["streaming", "done", "error"],
    }).notNull(),
    messageAttachemts: text({ mode: "json" })
      .$type<{ fileName: string; id: string }[]>()
      .default([]),
  },
  (table) => [index("idx_created_at_desc").on(desc(table.createdAt))],
);
export type SavedMessage = typeof message.$inferSelect;
export type SaveMessageInput = typeof message.$inferInsert;
