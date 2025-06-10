import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("/thread/:threadId", "routes/thread.tsx"),
  ]),
  route("/ws", "routes/ws.ts"),
  route("/auth/login", "routes/auth/login.ts"),
  route("/auth/callback", "routes/auth/callback.ts"),
] satisfies RouteConfig;
