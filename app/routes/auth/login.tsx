import { generateState, GitHub } from "arctic";
import { Github } from "lucide-react";
import { createCookie, redirect, useFetcher } from "react-router";
import type { Route } from "./+types/login";

export const githubOauthState = createCookie("github_oauth_state", {
  path: "/",
  sameSite: "lax",
  httpOnly: process.env.NODE_ENV === "production",
  secure: true,
});

export async function action({ context }: Route.LoaderArgs) {
  const github = new GitHub(
    context.cloudflare.env.GITHUB_CLIENT_ID,
    context.cloudflare.env.GITHUB_CLIENT_SECRET,
    null,
  );

  const state = generateState();
  const url = github.createAuthorizationURL(state, []);

  const expires = new Date(Date.now() + 60_000);
  const cookie = await githubOauthState.serialize(state, {
    expires,
    maxAge: 60,
  });

  return redirect(url.toString(), {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}

export default function HomePage() {
  const fetcher = useFetcher();

  const handleGitHubLogin = () => {
    fetcher.submit("/auth/login", {
      method: "POST",
    });
  };

  return (
    <div className="flex h-screen w-full flex-col justify-center bg-chat-background">
      {/* Main content area */}
      <div className="mx-auto max-w-3xl px-4 py-4">
        {/* Centered content */}
        <div className="flex h-full items-center justify-center">
          <div className="w-full max-w-md">
            {/* Main card with glassmorphism effect - preserved from original */}
            <div
              className="rounded-t-[20px] border-8 border-chat-border/60 bg-chat-overlay p-8"
              style={{
                outline: `8px solid oklch(var(--chat-input-gradient) / 0.3)`,
                boxShadow: `rgba(0, 0, 0, 0.1) 0px 80px 50px 0px,
                             rgba(0, 0, 0, 0.07) 0px 50px 30px 0px,
                             rgba(0, 0, 0, 0.06) 0px 30px 15px 0px,
                             rgba(0, 0, 0, 0.04) 0px 15px 8px,
                             rgba(0, 0, 0, 0.04) 0px 6px 4px,
                             rgba(0, 0, 0, 0.02) 0px 2px 2px`,
              }}
            >
              {/* Icon - Changed to GitHub to reflect the login method */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 backdrop-blur-sm">
                <Github className="h-8 w-8 text-primary" />
              </div>

              {/* Heading - Changed to be more welcoming */}
              <h1 className="mb-4 text-center text-2xl font-semibold text-foreground">
                Jerkić Chat login
              </h1>

              {/* Description - Updated to mention waitlist and access restriction */}
              <p className="mb-6 text-center leading-relaxed text-muted-foreground">
                Access to this application is currently limited to users on our
                waitlist. If you are not on the waitlist, you will not be able
                to use the app at this time. Log in with GitHub to check your
                status or join the waitlist.
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleGitHubLogin}
                  disabled={fetcher.state !== "idle"}
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                >
                  <Github className="h-5 w-5" />
                  Log in with GitHub
                </button>
              </div>
            </div>

            {/* Footer message - Optional, can be removed or changed */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                A clone of t3.chat
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
