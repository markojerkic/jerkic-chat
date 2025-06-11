import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const thread = sqliteTable("thread", {
  id: text().primaryKey(),
  title: text().notNull(),
  owner: text()
    .notNull()
    .references(() => userTable.id),
});

export const message = sqliteTable("message", {
  id: text().primaryKey(),
  textContent: text(),
  sender: text({ enum: ["user", "llm"] }).notNull(),
  model: text({
    enum: [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash",
      "gemini-2.5-pro-exp-03-25",
    ],
  })
    .notNull()
    .default("gemini-2.0-flash"),
  thread: text()
    .references(() => thread.id)
    .notNull(),
});

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
