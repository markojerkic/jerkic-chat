import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/thread/:threadId", "routes/thread.tsx"),
  route("/ws", "routes/ws.ts"),
] satisfies RouteConfig;
