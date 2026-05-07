import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "durable-sqlite",
  schema: "./src/db/user/schema.ts",
  out: "./src/db/user/drizzle",
});
