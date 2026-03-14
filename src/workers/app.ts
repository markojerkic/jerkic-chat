import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../database/schema";

// export { default } from "@tanstack/react-start/server-entry";
export { MessagesDurableObject } from "./workers/MessagesDurableObject";

export default createServerEntry({
  fetch(request, opts) {
    const db = drizzle(env.DB, { schema });

    return handler.fetch(request);
  },
});

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
