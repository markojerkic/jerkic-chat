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
  route("/branch", "routes/branch.ts"),
  route("retry-message", "routes/retry-message.ts"),
  route("/models", "routes/models.ts"),
  route("/waitlist", "routes/waitlist.tsx"),
  route("/auth/login", "routes/auth/login.tsx"),
  route("/auth/callback", "routes/auth/callback.ts"),
  route("/file", "routes/file/upload.ts"),
  route("/file/:messageId/:fileId", "routes/file/download.ts"),
] satisfies RouteConfig;
