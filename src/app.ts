import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../database/schema";

type RequestContext = {
  db: DrizzleD1Database<typeof schema>;
};

declare module "@tanstack/react-router" {
  interface Register {
    server: {
      requestContext: RequestContext;
    };
  }
}

export { MessagesDurableObject } from "./workers/MessagesDurableObject";

export default createServerEntry({
  fetch(request) {
    const db = drizzle(env.DB, { schema });

    return handler.fetch(request, { context: { db } });
  },
});
