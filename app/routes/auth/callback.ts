import { GitHub, type OAuth2Tokens } from "arctic";
import { redirect } from "react-router";
import { uuidv7 } from "uuidv7";
import { userTable } from "~/database/schema";
import { getLucia } from "~/server/auth/lucia";
import type { Route } from "./+types/callback";
import { githubOauthState } from "./login";

export async function loader({ context, request }: Route.LoaderArgs) {
  const github = new GitHub(
    context.cloudflare.env.GITHUB_CLIENT_ID,
    context.cloudflare.env.GITHUB_CLIENT_SECRET,
    null,
  );

  const searchParams = new URL(request.url).searchParams;
  const cookieHeader = request.headers.get("Cookie");
  const storedState = (await githubOauthState.parse(cookieHeader))!;

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
  } catch (e) {
    // Invalid code or client credentials
    return new Response(null, {
      status: 400,
    });
  }

  const githubUserResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.accessToken()}`,
    },
  });
  const githubUser: { id: string; login: string } =
    await githubUserResponse.json();
  const githubUserId = githubUser.id;
  const githubUsername = githubUser.login;

  const existingUser = await context.db.query.userTable.findFirst({
    where: (u, { eq }) => eq(u.githubId, githubUserId),
  });

  const lucia = getLucia(context);

  if (existingUser !== undefined) {
    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    return redirect("/", {
      headers: {
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  }

  const userId = uuidv7();

  await context.db.insert(userTable).values({
    id: userId,
    githubId: githubUserId,
    userName: githubUsername,
  });

  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  return redirect("/", {
    headers: {
      "Set-Cookie": sessionCookie.serialize(),
    },
  });
}
