import { generateState, GitHub } from "arctic";
import { createCookie, redirect } from "react-router";
import type { Route } from "./+types/login";

export const githubOauthState = createCookie("github_oauth_state", {
  path: "/",
  sameSite: "lax",
  httpOnly: process.env.NODE_ENV === "production",
  secure: true,
  expires: new Date(Date.now() + 60_000),
  maxAge: 60,
});

export async function loader({ context }: Route.LoaderArgs) {
  const github = new GitHub(
    context.cloudflare.env.GITHUB_CLIENT_ID,
    context.cloudflare.env.GITHUB_CLIENT_SECRET,
    null,
  );

  const state = generateState();
  const url = github.createAuthorizationURL(state, []);

  const cookie = await githubOauthState.serialize(state);

  return redirect(url.toString(), {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}
