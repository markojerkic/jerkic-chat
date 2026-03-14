import { redirect } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { AppContext } from "~/app";
import { getLucia } from "./lucia";

export const authMiddleware = createMiddleware().server(
  async ({ context, next }) => {
    const currentUser = getCurrentUser(context);
    console.log("current user, middleware", currentUser);
    if (!currentUser) {
      throw redirect({
        to: "/login",
      });
    }

    return next({
      context: {
        currentUser,
      },
    });
  },
);

export const validateSession = createServerFn().handler(async ({ context }) => {
  return getCurrentUser(context);
});

async function getCurrentUser(context: AppContext) {
  const request = getRequest();
  const cookies = request.headers.get("cookie");
  if (!cookies) {
    return null;
  }

  const lucia = getLucia(context);
  const sessionId = lucia.readSessionCookie(cookies);

  if (!sessionId) {
    return null;
  }

  const result = await lucia.validateSession(sessionId);
  return result;
}

export type UserContext = Awaited<ReturnType<typeof getCurrentUser>>;
