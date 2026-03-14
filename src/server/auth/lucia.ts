import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";
import type { AppLoadContext } from "react-router";
import { sessionTable, userTable } from "~/database/schema";

export function getLucia(ctx: AppLoadContext) {
  const adapter = new DrizzleSQLiteAdapter(ctx.db, sessionTable, userTable);

  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: process.env.NODE_ENV === "production",
      },
    },
    getUserAttributes: (attributes) => {
      return {
        // attributes has the type of DatabaseUserAttributes
        githubId: attributes.githubId,
        username: attributes.userName,
      };
    },
  });
}

export async function validateSession(ctx: AppLoadContext, request: Request) {
  const cookies = request.headers.get("cookie");
  if (!cookies) {
    return null;
  }

  const lucia = getLucia(ctx);
  const sessionId = lucia.readSessionCookie(cookies);

  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }

  const result = await lucia.validateSession(sessionId);
  return result;
}

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof getLucia>;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  githubId: number;
  userName: string;
}
