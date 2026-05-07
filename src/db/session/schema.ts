import { createId } from "@paralleldrive/cuid2";
import { asc, relations } from "drizzle-orm";
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
export type SavedMessageWithParts = SavedMessage & {
  parts: MessagePart[];
};

export type TextMessagePart = {
  type: "text";
  content: string;
};
export type ErrorMessagePart = {
  type: "error";
  content: string;
};
export type ReasoningMessagePart = {
  type: "reasoning";
  content: string;
  title?: string;
};
export type WebToolMessagePart = {
  type: "web-search" | "web-fetch";
  search: string[];
  results: any;
};
export type MessagePartContent =
  | TextMessagePart
  | ReasoningMessagePart
  | ErrorMessagePart
  | WebToolMessagePart;

export const messagePart = sqliteTable(
  "messagePart",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => createId()),
    messageId: text()
      .notNull()
      .references(() => message.id),
    textContent: text({ mode: "json" }).$type<MessagePartContent>(),
    type: text({
      enum: [
        "text",
        "reasoning",
        "web-search",
        "web-fetch",
        "tool-call",
        "error",
      ],
    }).notNull(),
    createdAt: integer({ mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_message_part_created_at_asc").on(asc(table.createdAt)),
  ],
);

export const messageRelations = relations(message, ({ many }) => ({
  parts: many(messagePart),
}));

export const messagePartRelations = relations(messagePart, ({ one }) => ({
  message: one(message, {
    fields: [messagePart.messageId],
    references: [message.id],
  }),
}));

export type MessagePart = typeof messagePart.$inferSelect;
export type MessagePartInput = typeof messagePart.$inferInsert;
export type MessagePartContentWithId = MessagePartContent & { id: string };
export type MessagePartContentType = NonNullable<
  MessagePart["textContent"]
>["type"];
