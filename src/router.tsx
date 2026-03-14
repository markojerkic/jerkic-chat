import { createRouter } from "@tanstack/react-router";
import type { AppContext } from "./app";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  });

  return router;
}

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: AppContext;
    };
    router: ReturnType<typeof getRouter>;
  }
}
