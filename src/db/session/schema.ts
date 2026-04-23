import { createId } from "@paralleldrive/cuid2";
import { asc } from "drizzle-orm";
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
    createdAt: integer({ mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    status: text({
      enum: ["streaming", "done", "error"],
    }).notNull(),
    order: integer(),
    messageAttachemts: text({ mode: "json" })
      .$type<{ fileName: string; id: string }[]>()
      .default([]),
  },
  (table) => [
    index("idx_created_at_desc").on(asc(table.createdAt), asc(table.order)),
  ],
);
export type SavedMessage = typeof message.$inferSelect;
export type SaveMessageInput = typeof message.$inferInsert;

export const messagePart = sqliteTable(
  "messagePart",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => createId()),
    messageId: text()
      .notNull()
      .references(() => message.id),
    type: text({
      enum: ["text", "reasoning", "tool-call", "error"],
    }).notNull(),
    createdAt: integer({ mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("idx_created_at_desc").on(asc(table.createdAt))],
);
export type SavedMessagePart = typeof messagePart.$inferSelect;
export type SaveMessagePartInput = typeof messagePart.$inferInsert;
