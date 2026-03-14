import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/thread/$threadId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authenticated/thread/$threadId"!</div>;
}
