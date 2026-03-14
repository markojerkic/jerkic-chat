import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "~/server/auth/utils";

const test = createServerFn().handler(({ context }) => {
  return "marko";
});

export const Route = createFileRoute("/_authenticated/")({
  server: {
    middleware: [authMiddleware],
  },
  component: RouteComponent,
  loader: () => test(),
});

function RouteComponent() {
  return <div>Ovo je root</div>;
}
