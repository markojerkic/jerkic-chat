import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/thread/$threadId/raw")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authenticated/thread/$threadId/raw"!</div>;
}
