import { GitHub, type OAuth2Tokens } from "arctic";
import type { Route } from "./+types/callback";
import { githubOauthState } from "./login";

export async function loader({ context, request, params }: Route.LoaderArgs) {
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
  const githubUser = await githubUserResponse.json();
  const githubUserId = githubUser.id;
  const githubUsername = githubUser.login;

  // TODO: Replace this with your own DB query.
  const existingUser = await getUserFromGitHubId(githubUserId);

  if (existingUser !== null) {
    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, existingUser.id);
    setSessionTokenCookie(context, sessionToken, session.expiresAt);
    return context.redirect("/");
  }

  // TODO: Replace this with your own DB query.
  const user = await createUser(githubUserId, githubUsername);

  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, user.id);
  setSessionTokenCookie(context, sessionToken, session.expiresAt);
  return context.redirect("/");
}
