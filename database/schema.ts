import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const guestBook = sqliteTable("guestBook", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
});

export const thread = sqliteTable("thread", {
  id: text().primaryKey(),
  title: text(),
});

export const message = sqliteTable("message", {
  id: text().primaryKey(),
  textContent: text(),
  sender: text({ enum: ["user", "llm"] }).notNull(),
  thread: text()
    .references(() => thread.id)
    .notNull(),
});

export const userTable = sqliteTable("user", {
  id: text("id").primaryKey(),
  githubId: text().notNull(),
});

export const sessionTable = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at").notNull(),
});
