import type { Config } from "drizzle-kit";

export default {
  out: "./src/db/d1/drizzle",
  schema: "./src/db/d1/schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    databaseId: "4a406bef-fcf2-442c-9fd1-7d6b03f20b4d",
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    token: process.env.CLOUDFLARE_TOKEN!,
  },
} satisfies Config;
