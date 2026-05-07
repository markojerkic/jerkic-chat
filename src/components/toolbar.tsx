import { Moon, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "./ui/button";

export const ThreadToolbar = () => {
  return (
    <>
      <div
        className="fixed right-0 top-0 z-20 h-16 w-28 max-sm:hidden"
        style={{ clipPath: "inset(0px 0px 0px 0px)" }}
      >
        <div
          className="ease-snappy group pointer-events-none absolute top-4 z-10 -mb-8 h-32 w-full origin-top transition-all"
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
        className="fixed right-2 top-2 z-20 max-sm:hidden"
        style={{ right: "var(--firefox-scrollbar, 0.5rem)" }}
      >
        <div className="bg-gradient-noise-top text-muted-foreground flex items-center gap-0.5 rounded-md rounded-bl-xl p-1 transition-all">
          <Button className="hover:bg-muted/40 hover:text-foreground focus-visible:ring-ring disabled:hover:text-foreground/50 inline-flex size-8 items-center justify-center gap-2 whitespace-nowrap rounded-md rounded-bl-xl bg-inherit text-sm font-medium shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
            <Settings2 className="size-4" />
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="hover:bg-muted/40 hover:text-foreground focus-visible:ring-ring disabled:hover:text-foreground/50 inline-flex size-8 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-inherit text-sm font-medium shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
                <Moon className="absolute size-4 transition-all duration-200" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>No money left in the budget!</DialogTitle>
                <DialogDescription>
                  <img
                    className="py-2"
                    src="https://c.tenor.com/cYXMfFdhAmMAAAAd/tenor.gif"
                  />
                  <span className="pt-4">
                    Unfortunately, there was no money left in the budget for a
                    fancy feature like dark mode. Plus, I inlined a bunch of CSS
                    variables, and I don't feel like refactoring it all 😅.
                  </span>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};
