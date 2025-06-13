import { Moon, Settings2, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

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
      <div
        className="fixed top-0 right-0 z-20 h-16 w-28 max-sm:hidden"
        style={{ clipPath: "inset(0px 0px 0px 0px)" }}
      >
        <div
          className="group ease-snappy pointer-events-none absolute top-4 z-10 -mb-8 h-32 w-full origin-top transition-all"
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
            <path
              stroke="var(--muted)"
              className="translate-y-[0.5px]"
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

      <div
        className="fixed top-2 right-2 z-20 max-sm:hidden"
        style={{ right: "var(--firefox-scrollbar, 0.5rem)" }}
      >
        <div className="flex flex-row items-center gap-0.5 rounded-md rounded-bl-xl bg-gradient-noise-top p-1 text-muted-foreground transition-all">
          <Button className="inline-flex size-8 items-center justify-center gap-2 rounded-md rounded-bl-xl bg-inherit text-sm font-medium whitespace-nowrap shadow-none transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
            <Settings2 className="size-4" />
          </Button>

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
