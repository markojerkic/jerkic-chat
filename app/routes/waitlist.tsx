import { ExternalLink, Github, Lock } from "lucide-react";

export default function RestrictedAccessMessage() {
  return (
    <div className="flex h-screen w-full flex-col justify-center bg-chat-background">
      {/* Main content area */}
      <div className="mx-auto max-w-3xl px-4 py-4">
        {/* Centered content */}
        <div className="flex h-full items-center justify-center">
          <div className="w-full max-w-md">
            {/* Main card with glassmorphism effect */}
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
              {/* Icon */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 backdrop-blur-sm">
                <Lock className="h-8 w-8 text-primary" />
              </div>

              {/* Heading */}
              <h1 className="mb-4 text-center text-2xl font-semibold text-foreground">
                Access Restricted
              </h1>

              {/* Description */}
              <p className="mb-6 text-center leading-relaxed text-muted-foreground">
                This application is currently available only to specific users.
                If you're interested in trying it out, feel free to reach out.
              </p>

              {/* Contact button */}
              <div className="space-y-4">
                <a
                  href="https://github.com/markojerkic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                >
                  <Github className="h-5 w-5" />
                  Contact me on GitHub
                  <ExternalLink className="h-4 w-4" />
                </a>

                {/* Additional info */}
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    You can find my email and social media accounts there
                  </p>
                </div>
              </div>
            </div>

            {/* Footer message */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Thank you for your interest!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
