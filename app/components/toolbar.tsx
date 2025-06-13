import { Moon, Settings2, Sun } from "lucide-react";
import { useState } from "react";

export const ThreadToolbar = () => {
  const [theme, setTheme] = useState("light");

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      return newTheme;
    });
  };

  return (
    <>
      {/*
        This is the decorative background/border element (the "mask").
        Its colors (fill and stroke) are determined by CSS variables.
        If it appears black, ensure --gradient-noise-top and --chat-border
        are correctly defined in your global CSS (e.g., globals.css).
      */}
      <div
        className="fixed top-0 right-0 z-20 h-16 w-28 max-sm:hidden"
        // The clip-path creates the angled cut-off effect and also pulls the element
        // in by 12px from the right edge. If you want it to truly touch the right edge,
        // you would remove or adjust this clip-path.
        style={{ clipPath: "inset(0px 0px 0px 0px)" }}
      >
        <div
          className="group ease-snappy pointer-events-none absolute top-4 z-10 -mb-8 h-32 w-full origin-top transition-all"
          // REMOVED hsl() wrapper here
          style={{ boxShadow: "10px -10px 8px 2px var(--gradient-noise-top)" }}
        >
          <svg
            className="absolute -right-8 h-9 origin-top-left skew-x-[30deg] overflow-visible"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 128 32"
            xmlSpace="preserve"
          >
            {/* This line uses --gradient-noise-top for its stroke */}
            {/* REMOVED hsl() wrapper here */}
            <line
              stroke="var(--gradient-noise-top)"
              strokeWidth="2px"
              shapeRendering="optimizeQuality"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeMiterlimit="10"
              x1="1"
              y1="0"
              x2="128"
              y2="0"
            ></line>
            {/* This path uses --chat-border for its stroke (the main border)
                and --gradient-noise-top for its fill (the background of the "mask").
                If the border is black, check your --chat-border variable. */}
            {/* REMOVED hsl() wrapper here */}
            <path
              stroke="var(--muted)"
              className="translate-y-[0.5px]"
              // REMOVED hsl() wrapper here
              fill="var(--gradient-noise-top)"
              shapeRendering="optimizeQuality"
              strokeWidth="1px"
              strokeLinecap="round"
              strokeMiterlimit="10"
              vectorEffect="non-scaling-stroke"
              d="M0,0c5.9,0,10.7,4.8,10.7,10.7v10.7c0,5.9,4.8,10.7,10.7,10.7H128V0"
            ></path>
          </svg>
        </div>
      </div>

      {/* The button container */}
      <div
        className="fixed top-2 right-2 z-20 max-sm:hidden"
        // This inline style accounts for Firefox scrollbar width,
        // creating a slight offset from the right edge.
        // If you want the buttons to truly touch the right edge,
        // you could change this to `right: 0` or remove it and use `right-0` Tailwind class.
        style={{ right: "var(--firefox-scrollbar, 0.5rem)" }}
      >
        <div
          className="flex flex-row items-center gap-0.5 rounded-md rounded-bl-xl bg-gradient-noise-top p-1 text-muted-foreground transition-all"
          // The background of this div is also determined by a CSS variable via `bg-gradient-noise-top`.
          // This class should work correctly as Tailwind will resolve it to `oklch(...)`
        >
          {/* Settings Icon */}
          <a
            aria-label="Go to settings"
            role="button"
            data-state="closed"
            href="/settings/customization?rt=b6d12825-e115-4d1b-91ba-1f45098ffa92"
            data-discover="true"
          >
            <button
              className="inline-flex size-8 items-center justify-center gap-2 rounded-md rounded-bl-xl text-sm font-medium whitespace-nowrap transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
              type="button"
            >
              <Settings2 className="size-4" />
            </button>
          </a>

          {/* Theme Switcher Icon (Sun/Moon) */}
          <button
            className="group relative inline-flex size-8 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
            tabIndex={-1}
            data-state="closed"
            onClick={toggleTheme}
          >
            <Moon
              className={`absolute size-4 transition-all duration-200 ${
                theme === "light" ? "scale-100 rotate-0" : "scale-0 rotate-90"
              }`}
            />
            <Sun
              className={`absolute size-4 transition-all duration-200 ${
                theme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90"
              }`}
            />
            <span className="sr-only">Toggle theme</span>
          </button>
        </div>
      </div>
    </>
  );
};
