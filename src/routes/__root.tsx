/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import css from "../app.css?url";
import { Toaster } from "../components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { rel: "stylesheet", href: css },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "https://c.tenor.com/cYXMfFdhAmMAAAAd/tenor.gif",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
        <Toaster />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
//   let message = "Oops!";
//   let details = "An unexpected error occurred.";
//   let stack: string | undefined;
//
//   if (isRouteErrorResponse(error)) {
//     message = error.status === 404 ? "404" : "Error";
//     details =
//       error.status === 404
//         ? "The requested page could not be found."
//         : error.statusText || details;
//   } else if (import.meta.env.DEV && error && error instanceof Error) {
//     details = error.message;
//     stack = error.stack;
//   }
//
//   return (
//     <main className="container mx-auto p-4 pt-16">
//       <h1>{message}</h1>
//       <p>{details}</p>
//       {stack && (
//         <pre className="w-full overflow-x-auto p-4">
//           <code>{stack}</code>
//         </pre>
//       )}
//     </main>
//   );
// }
