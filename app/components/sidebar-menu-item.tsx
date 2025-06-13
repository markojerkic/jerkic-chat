import { X } from "lucide-react"; // Assuming you have lucide-react installed for icons
import { Link, useParams } from "react-router";
import type { Route } from "../routes/+types/layout";
import { SidebarMenuItem } from "./ui/sidebar";

// If SidebarMenuItem is not a component you've defined elsewhere (e.g., from Shadcn UI),
// you might need to define a simple one, for example:
// const SidebarMenuItem = ({ children, className, ...props }) => <li className={className} {...props}>{children}</li>;
// Make sure SidebarMenuItem is imported or defined in the scope where ThreadMenuItem is used.

export type ThreadMenuItemProps = {
  thread: {
    id: string;
    title: string | null;
  };
};

export function ThreadMenuItem({ thread }: ThreadMenuItemProps) {
  const params = useParams<Route.ComponentProps["params"]>();

  // Determine if the current thread is active based on params or window location
  const isActive =
    params.threadId === thread.id ||
    (typeof window !== "undefined" &&
      window.location.pathname.endsWith(thread.id));

  return (
    // SidebarMenuItem acts as the list item wrapper.
    // The original className "flex items-center gap-2" is applied here.
    // "group/menu-item" is added to match the example HTML's outer group.
    <SidebarMenuItem className="group/menu-item relative flex items-center gap-2">
      <Link
        data-is-active={isActive}
        to={{ pathname: `/thread/${thread.id}` }}
        // The Link itself is a flex container for its content (text and action buttons).
        // "group/link" makes this Link the reference for hover effects on its children.
        className="group/link relative flex h-9 w-full items-center overflow-hidden rounded-lg p-2 py-1 text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring hover:focus-visible:bg-sidebar-accent data-[is-active=true]:bg-sidebar-accent data-[is-active=true]:text-sidebar-accent-foreground data-[is-active=true]:focus-visible:bg-sidebar-accent"
      >
        {/* This div contains the thread title and handles truncation */}
        <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {thread.title ?? thread.id}
        </div>

        {/* Action buttons container: This div slides in from the right on hover */}
        <div className="pointer-events-auto absolute top-0 right-1 bottom-0 z-50 flex translate-x-full items-center justify-end text-muted-foreground transition-transform group-hover/link:translate-x-0 group-hover/link:bg-sidebar-accent">
          {/* Optional: Gradient overlay for a smoother visual transition, matching the example */}
          <div className="pointer-events-none absolute top-0 right-[100%] bottom-0 h-full w-8 bg-gradient-to-l from-sidebar-accent to-transparent opacity-0 group-hover/link:opacity-100"></div>

          {/* Delete button */}
          <button
            className="rounded-md p-1.5 hover:bg-destructive/50 hover:text-destructive-foreground"
            tabIndex={-1} // Prevents the button from being tab-focused by default
            aria-label="Delete thread"
            onClick={(e) => {
              e.preventDefault(); // Prevent the Link from navigating
              e.stopPropagation(); // Stop the click event from bubbling up to the Link
              alert("delete");
            }}
          >
            <X className="size-4" /> {/* Lucide X icon */}
          </button>
        </div>
      </Link>
    </SidebarMenuItem>
  );
}
