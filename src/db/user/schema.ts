import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const thread = sqliteTable("thread", {
  id: text()
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
});
export type Thread = typeof thread.$inferSelect;
export type ThreadInput = typeof thread.$inferInsert;
