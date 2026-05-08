import { createFileRoute } from "@tanstack/react-router";
import { getGeneratedImage } from "~/server/thread-actions.server";

export const Route = createFileRoute(
  "/_authenticated/thread/$threadId/image/$messageId",
)({
  server: {
    handlers: {
      GET: async ({ request, params, context }) => {
        const key = new URL(request.url).searchParams.get("key");
        if (!key?.startsWith("tools/image/")) {
          return new Response("Not found", { status: 404 });
        }

        const image = await getGeneratedImage({
          userId: context.currentUser.id,
          threadId: params.threadId,
          messageId: params.messageId,
          key,
        });

        if (!image) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(image.buffer, {
          headers: {
            "Cache-Control": "private, max-age=3600",
            "Content-Type": image.contentType,
          },
        });
      },
    },
  },
});
