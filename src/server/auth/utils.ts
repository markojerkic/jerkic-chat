import { redirect } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Session } from "inspector";
import type { User } from "lucia";
import type { AppContext } from "~/app";
import { getLucia } from "./lucia";

export const authMiddleware = createMiddleware().server(
  async ({ context, next }) => {
    const currentUser = await _getCurrentUser(context);

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

export const getCurrentUser = createServerFn()
  .middleware([authMiddleware])
  .handler(({ context }) => context.currentUser);

async function _getCurrentUser(context: AppContext) {
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
  if (!result.user || !result.session) {
    return null;
  }

  return result;
}

export type UserContext = {
  user: User;
  session: Session;
};
