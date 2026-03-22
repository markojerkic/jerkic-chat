import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./db/d1/schema";

export type AppContext = {
  db: DrizzleD1Database<typeof schema>;
};
export type DB = DrizzleD1Database<typeof schema>;

export { ChatSession } from "./workers/ChatSession";
export { MessagesDurableObject } from "./workers/MessagesDurableObject";

export default createServerEntry({
  fetch(request) {
    const db = drizzle(env.DB, { schema });

    return handler.fetch(request, { context: { db } });
  },
});
