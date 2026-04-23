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

export const messageSegment = sqliteTable(
  "messageSegment",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => createId()),
    messageId: text()
      .notNull()
      .references(() => message.id, { onDelete: "cascade" }),
    type: text({ enum: ["text", "tool", "reasoning"] }).notNull(),
    content: text().notNull(),
    order: integer().notNull(),
  },
  (table) => [
    index("idx_message_segment_message_order").on(
      asc(table.messageId),
      asc(table.order),
    ),
  ],
);

export type SavedMessageRow = typeof message.$inferSelect;
export type SavedMessageSegment = typeof messageSegment.$inferSelect;
export type SavedMessage = SavedMessageRow & {
  segments: SavedMessageSegment[];
};
export type SaveMessageInput = typeof message.$inferInsert;
export type SaveMessageSegmentInput = typeof messageSegment.$inferInsert;
