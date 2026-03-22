import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "durable-sqlite",
  schema: "./src/db/session/schema.ts",
  out: "./src/db/session/drizzle",
});
