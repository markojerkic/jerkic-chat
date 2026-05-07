import { createFileRoute, redirect } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { generateState, GitHub } from "arctic";
import { env } from "cloudflare:workers";
import { Github } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  server: {
    handlers: {
      POST: async () => {
        const github = new GitHub(
          env.GITHUB_CLIENT_ID,
          env.GITHUB_CLIENT_SECRET,
          null,
        );
        const state = generateState();
        const url = github.createAuthorizationURL(state, []);

        const expires = new Date(Date.now() + 60_000);
        setCookie("github_oauth_state", state, {
          expires,
          maxAge: 60,
          path: "/",
          sameSite: "lax",
          httpOnly: process.env.NODE_ENV === "production",
          secure: true,
        });

        return redirect({
          href: url.toString(),
          statusCode: 303,
        });
      },
    },
  },
});

function RouteComponent() {
  return (
    <div className="bg-chat-background flex h-screen w-full flex-col justify-center">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="flex h-full items-center justify-center">
          <div className="w-full max-w-md">
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
              <div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full backdrop-blur-sm">
                <Github className="text-primary h-8 w-8" />
              </div>

              <h1 className="text-foreground mb-4 text-center text-2xl font-semibold">
                Jerkić Chat login
              </h1>

              <p className="text-muted-foreground mb-6 text-center leading-relaxed">
                Access to this application is currently limited to users on our
                waitlist. If you are not on the waitlist, you will not be able
                to use the app at this time. Log in with GitHub to check your
                status or join the waitlist.
              </p>

              <form method="post" action="/login" className="space-y-4">
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring flex w-full items-center justify-center gap-3 rounded-lg px-6 py-3 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                >
                  <Github className="h-5 w-5" />
                  Log in with GitHub
                </button>
              </form>
            </div>

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
