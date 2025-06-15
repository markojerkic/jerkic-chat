import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const thread = sqliteTable(
  "thread",
  {
    id: text().primaryKey(),
    title: text().notNull(),
    owner: text()
      .notNull()
      .references(() => userTable.id),
  },
  (table) => {
    return {
      ownerIdx: index("thread_owner_idx").on(table.owner, table.id),
    };
  },
);

export const message = sqliteTable(
  "message",
  {
    id: text().primaryKey(),
    textContent: text(),
    sender: text({ enum: ["user", "llm"] }).notNull(),
    model: text().notNull(),
    status: text({
      enum: ["streaming", "done", "error", "precreated"],
    }).notNull(),
    messageAttachemts: text({ mode: "json" })
      .$type<{ fileName: string; id: string }[]>()
      .default([]),
    thread: text()
      .references(() => thread.id)
      .notNull(),
  },
  (table) => {
    return {
      threadIdx: index("message_thread_idx").on(table.thread, table.id),
    };
  },
);
export type SavedMessage = typeof message.$inferSelect;
export type SaveMessageInput = typeof message.$inferInsert;

export const userTable = sqliteTable("user", {
  id: text("id").primaryKey(),
  githubId: text().notNull().unique(),
  userName: text().notNull().unique(),
});

export const sessionTable = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at").notNull(),
});

export const userWhitelist = sqliteTable("user_whitelist", {
  username: text("username").primaryKey(),
});

export const threadRelations = relations(thread, ({ one, many }) => ({
  owner: one(userTable, {
    fields: [thread.owner],
    references: [userTable.id],
  }),
  messages: many(message),
}));
