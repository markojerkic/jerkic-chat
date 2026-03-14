import { ExternalLink, Github, Lock } from "lucide-react";

export default function RestrictedAccessMessage() {
  return (
    <div className="bg-chat-background flex h-screen w-full flex-col justify-center">
      {/* Main content area */}
      <div className="mx-auto max-w-3xl px-4 py-4">
        {/* Centered content */}
        <div className="flex h-full items-center justify-center">
          <div className="w-full max-w-md">
            {/* Main card with glassmorphism effect */}
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
              {/* Icon */}
              <div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full backdrop-blur-sm">
                <Lock className="text-primary h-8 w-8" />
              </div>

              {/* Heading */}
              <h1 className="text-foreground mb-4 text-center text-2xl font-semibold">
                Access Restricted
              </h1>

              {/* Description */}
              <p className="text-muted-foreground mb-6 text-center leading-relaxed">
                This application is currently available only to specific users.
                If you're interested in trying it out, feel free to reach out.
              </p>

              {/* Contact button */}
              <div className="space-y-4">
                <a
                  href="https://github.com/markojerkic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring flex w-full items-center justify-center gap-3 rounded-lg px-6 py-3 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                >
                  <Github className="h-5 w-5" />
                  Contact me on GitHub
                  <ExternalLink className="h-4 w-4" />
                </a>

                {/* Additional info */}
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    You can find my email and social media accounts there
                  </p>
                </div>
              </div>
            </div>

            {/* Footer message */}
            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Thank you for your interest!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
