import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { AppContext } from "./app";
import { routeTree } from "./routeTree.gen";
import { ChatContext, createChatStore } from "./store/message";

export function getRouter() {
  const queryClient = new QueryClient();
  const chatStore = createChatStore();

  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    context: {
      queryClient,
      chatStore,
    },
    dehydrate: () => {
      return {
        queryClientState: dehydrate(queryClient) as any,
      };
    },
    hydrate: (dehydrated) => {
      console.log("hydrate", dehydrated);
      hydrate(queryClient, dehydrated.queryClientState);
    },
    Wrap: ({ children }) => {
      return (
        <QueryClientProvider client={queryClient}>
          <ChatContext.Provider value={chatStore}>
            {children}
          </ChatContext.Provider>
        </QueryClientProvider>
      );
    },
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
