import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../database/schema";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
    db: DrizzleD1Database<typeof schema>;
  }
}

export { MessagesDurableObject } from "./workers/MessagesDurableObject";

export default createServerEntry({
  fetch(request, opts) {
    const db = drizzle(env.DB, { schema });

    return handler.fetch(request, {
      context: {
        env,
        db,
      },
    });
  },
});

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: {
        env: Env;
        db: DrizzleD1Database<typeof schema>;
      };
    };
  }
}

// const requestHandler = createRequestHandler(
//   () => import("virtual:react-router/server-build"),
//   import.meta.env.MODE,
// );
//
// export default {
//   async fetch(request, env, ctx) {
//     const db = drizzle(env.DB, { schema });
//
//     return requestHandler(request, {
//       cloudflare: { env, ctx },
//       db,
//     });
//   },
// } satisfies ExportedHandler<Env>;
