import { createId } from "@paralleldrive/cuid2";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const message = sqliteTable("message", {
  id: text()
    .primaryKey()
    .$defaultFn(() => createId()),
  textContent: text(),
  sender: text({ enum: ["user", "llm"] }).notNull(),
  model: text().notNull(),
  status: text({
    enum: ["streaming", "done", "error"],
  }).notNull(),
  messageAttachemts: text({ mode: "json" })
    .$type<{ fileName: string; id: string }[]>()
    .default([]),
});
export type SavedMessage = typeof message.$inferSelect;
export type SaveMessageInput = typeof message.$inferInsert;
