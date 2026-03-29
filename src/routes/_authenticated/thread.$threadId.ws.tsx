import { createFileRoute } from "@tanstack/react-router";
import { getWsConnection } from "~/server/llm.server";

export const Route = createFileRoute("/_authenticated/thread/$threadId/ws")({
  server: {
    handlers: {
      GET: async ({ request, params, context }) => {
        console.log("hi", context);
        return await getWsConnection(
          request,
          context.currentUser.id,
          params.threadId,
        );
      },
    },
  },
});
