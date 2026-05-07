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
    <div className="bg-chat-background flex h-screen w-full flex-col justify-center">
      {/* Main content area */}
      <div className="mx-auto max-w-3xl px-4 py-4">
        {/* Centered content */}
        <div className="flex h-full items-center justify-center">
          <div className="w-full max-w-md">
            {/* Main card with glassmorphism effect - preserved from original */}
            <div
              className="border-chat-border/60 bg-chat-overlay rounded-t-[20px] border-8 p-8"
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
              <div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full backdrop-blur-sm">
                <Github className="text-primary h-8 w-8" />
              </div>

              {/* Heading - Changed to be more welcoming */}
              <h1 className="text-foreground mb-4 text-center text-2xl font-semibold">
                Jerkić Chat login
              </h1>

              {/* Description - Updated to mention waitlist and access restriction */}
              <p className="text-muted-foreground mb-6 text-center leading-relaxed">
                Access to this application is currently limited to users on our
                waitlist. If you are not on the waitlist, you will not be able
                to use the app at this time. Log in with GitHub to check your
                status or join the waitlist.
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleGitHubLogin}
                  disabled={fetcher.state !== "idle"}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring flex w-full items-center justify-center gap-3 rounded-lg px-6 py-3 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                >
                  <Github className="h-5 w-5" />
                  Log in with GitHub
                </button>
              </div>
            </div>

            {/* Footer message - Optional, can be removed or changed */}
            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                A clone of t3.chat
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
