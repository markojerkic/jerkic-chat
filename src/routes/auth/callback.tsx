import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import { GitHub, type OAuth2Tokens } from "arctic";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { uuidv7 } from "uuidv7";
import * as schema from "~/db/d1/schema";
import { getLucia } from "~/server/auth/lucia";

export const Route = createFileRoute("/auth/callback")({
  component: RouteComponent,
  server: {
    handlers: {
      GET: async () => {
        const github = new GitHub(
          env.GITHUB_CLIENT_ID,
          env.GITHUB_CLIENT_SECRET,
          null,
        );

        const request = getRequest();
        const searchParams = new URL(request.url).searchParams;
        const storedState = getCookie("github_oauth_state");

        const code = searchParams.get("code");
        const state = searchParams.get("state");
        if (code === null || state === null || storedState === null) {
          return new Response(null, {
            status: 400,
          });
        }

        if (state !== storedState) {
          return new Response(null, {
            status: 400,
          });
        }

        let tokens: OAuth2Tokens;
        try {
          tokens = await github.validateAuthorizationCode(code);
        } catch {
          return new Response(null, {
            status: 400,
          });
        }

        const githubUserResponse = await fetch("https://api.github.com/user", {
          headers: {
            "User-Agent": "rr-chat-local",
            Authorization: `Bearer ${tokens.accessToken()}`,
          },
        });

        if (!githubUserResponse.ok) {
          console.error(await githubUserResponse.text());
        }

        const githubUser: { id: string; login: string } =
          await githubUserResponse.json();
        const githubUserId = githubUser.id;
        const githubUsername = githubUser.login;

        const db = drizzle(env.DB, { schema });

        const isWhitelisted = await db.query.userWhitelist
          .findFirst({
            where: (u, { eq }) => eq(u.username, githubUsername),
          })
          .then((user) => !!user);

        if (!isWhitelisted) {
          throw redirect({
            href: "/waitlist",
          });
        }

        const existingUser = await db.query.userTable.findFirst({
          where: (u, { eq }) => eq(u.githubId, githubUserId),
        });

        const lucia = getLucia({ db });

        if (existingUser !== undefined) {
          const session = await lucia.createSession(existingUser.id, {});
          const sessionCookie = lucia.createSessionCookie(session.id);

          return redirect({
            href: "/",
            headers: {
              "Set-Cookie": sessionCookie.serialize(),
            },
          });
        }

        const userId = uuidv7();

        await db.insert(schema.userTable).values({
          id: userId,
          githubId: githubUserId,
          userName: githubUsername,
        });

        const session = await lucia.createSession(userId, {});
        const sessionCookie = lucia.createSessionCookie(session.id);

        return redirect({
          href: "/",
          headers: {
            "Set-Cookie": sessionCookie.serialize(),
          },
        });
      },
    },
  },
});

function RouteComponent() {
  return null;
}
