import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { AppSidebar } from "~/components/sidebar-content";
import { ThreadToolbar } from "~/components/toolbar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { authMiddleware, getCurrentUser } from "~/server/auth/utils";
import { getDefaultModel } from "~/server/llm/models.server";
import { getUserThreads } from "~/server/thread-actions.functions";

export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
  server: {
    middleware: [authMiddleware],
  },
  loader: async ({ context }) => {
    const [user, threads, defaultModel] = await Promise.all([
      getCurrentUser(),
      getUserThreads({ data: { page: 0 } }),
      getDefaultModel(),
    ]);

    context.queryClient.setQueryData(["models", "default-model"], defaultModel);

    context.queryClient.setQueryData(["threads"], {
      pages: [threads],
      pageParams: [0],
    });

    return { user, threads };
  },
  staleTime: Infinity,
});

function RouteComponent() {
  const { user } = Route.useLoaderData();
  const { threadId } = useParams({ strict: false });

  return (
    <SidebarProvider>
      <AppSidebar user={user} activeThread={threadId} />
      <ThreadToolbar />
      <SidebarInset className="h-screen pt-4">
        <div className="border-muted h-full overflow-hidden rounded-tl-xl border-l border-t">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
