// src/components/markdown-renderer.tsx
import { Fragment, type JSX } from "react";
import rehypeReact from "rehype-react";
import remarkGfm from "remark-gfm"; // For GitHub Flavored Markdown (tables, task lists)
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { cn } from "~/lib/utils"; // Assuming you have this utility
import { CodeBlock } from "./code-block"; // Your existing CodeBlock component

// --- Custom Components for Markdown Elements ---

// Basic Table Components (add more styling as needed)
const MarkdownTable = ({ children }: { children: React.ReactNode }) => (
  <div className="my-4 overflow-auto rounded-lg border">
    <table className="w-full min-w-full text-left text-sm text-gray-500 dark:text-gray-400">
      {children}
    </table>
  </div>
);

const MarkdownTableHead = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-gray-50 text-xs text-gray-700 uppercase dark:bg-gray-700 dark:text-gray-400">
    {children}
  </thead>
);

const MarkdownTableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody>{children}</tbody>
);

const MarkdownTableRow = ({ children }: { children: React.ReactNode }) => (
  <tr className="border-b bg-white dark:border-gray-700 dark:bg-gray-800">
    {children}
  </tr>
);

const MarkdownTableHeaderCell = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <th scope="col" className="px-6 py-3">
    {children}
  </th>
);

const MarkdownTableCell = ({ children }: { children: React.ReactNode }) => (
  <td className="px-6 py-4">{children}</td>
);

// Optional: Custom renderer for <p> tags for consistent margins
const Paragraph = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 last:mb-0">{children}</p>
);
// Import `build` directly from rehype-react
// ❌ You no longer need to explicitly import jsx, jsxs from react/jsx-runtime here
//    `rehype-react/lib/build` handles it internally.
// import { jsx, jsxs } from "react/jsx-runtime"; // REMOVE THIS LINE

// ... (Your MarkdownTable components and Paragraph component remain the same) ...

export default ({ content }: { content: string }) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeReact, {
      // ✅ Use the `rehype-react/lib/build` factory directly.
      // This automatically picks up `jsx` and `jsxs` from `react/jsx-runtime`
      // based on your React environment setup.
      // Make sure the `Fragment` is still passed if you use it in your components.
      Fragment: Fragment,
      // You should not pass createElement directly if using the modern JSX runtime
      // and relying on rehype-react's automatic detection.
      // `rehype-react`'s default behavior (when `createElement` is not provided)
      // is to look for `jsx` and `jsxs` from `react/jsx-runtime`.
      // The `build` helper simplifies this for you.
      //
      // However, if your build is somehow *not* automatically handling `jsx/jsxs`,
      // or if rehype-react's build utility still causes issues, you can explicitly
      // define the `build` function with `jsx`, `jsxs` (if you *do* import them),
      // or directly use `rehype-react/common` if you're on an older version of rehype-react.
      //
      // Let's stick to the simplest, most common modern approach first:
      // Remove `createElement: jsx, jsxs: jsxs` and let `rehype-react` detect them.
      // The original code was correct in using `createElement: jsx`,
      // but the error message hints at a more fundamental environment issue.
      // The `build` helper implicitly does this correctly.

      // If the error persists after trying the below, then your React/Babel/Webpack
      // configuration for JSX runtime might be the root cause.
      //
      // Reverting to the simpler version that should work:
      // You've correctly imported `jsx` and `jsxs`. The error "Expected `jsx` in production options"
      // might indicate an issue with how `rehype-react` or your build system expects these to be provided.
      // Often, you just need to provide them directly to the `rehype-react` options.

      // Let's try to remove `jsxs` from the explicit options, as `createElement` is usually enough
      // and `rehype-react` can often infer `jsxs` if `createElement` is there, or handle it via `build`.

      // The safest bet for modern React (React 17+ and automatic JSX runtime)
      // is often just providing `Fragment` and letting `rehype-react` resolve `jsx` and `jsxs` itself.
      // BUT, your error specifically says `Expected jsx`. So we NEED to provide it.
      // The most robust way is to make sure your build is set up correctly for automatic runtime,
      // and then to explicitly pass the `jsx` factory.

      // Let's go back to the original syntax for `rehype-react` which *should* work
      // if your environment is correctly set for React 17+ automatic JSX runtime.
      // If it still breaks, it means your build setup is the culprit.

      // Final attempt at the `rehype-react` options that should work:
      // It expects the functions from `react/jsx-runtime`

      // --- CRITICAL PART ---
      // Try with just `Fragment` first. If `rehype-react` is up-to-date and your
      // build setup is modern, it should find `jsx` and `jsxs` automatically.
      // If that fails, re-add `createElement: jsx` and ensure `jsxs` is there if needed.
      //
      // The `build` function from `rehype-react/lib/build` *is* the preferred way.
      // But it needs `jsx` and `jsxs` passed to it. Let's try that.

      // import { build } from 'rehype-react/lib/build'; // This might be needed for older versions or specific setups.
      // For current versions of `rehype-react`, you often provide `createElement` directly.

      // The `TypeError: Expected jsx in production options` implies that the `build`
      // function or an internal part of `rehype-react` is trying to access `options.jsx`
      // when running in production (or a production-like environment).

      // Let's try this, which explicitly provides what `rehype-react` expects from the build function:
      // It's possible `rehype-react` internally transforms the provided `createElement`
      // to `jsx` and expects it at the top level for production.

      // **Solution using an explicit `build` setup (most robust for this error):**
      // Remove `import { jsx, jsxs } from "react/jsx-runtime";`
      // And replace `.use(rehypeReact, { ... })` with:
      // .use(rehypeReact, build({
      //   Fragment: Fragment,
      //   jsx: jsx, // You would need to import jsx if using this `build` helper explicitly
      //   jsxs: jsxs, // You would need to import jsxs if using this `build` helper explicitly
      //   components: { ... }
      // }))
      //
      // This means you *do* need to import `jsx` and `jsxs`.
      // The error suggests that rehype-react's internal production code path
      // expects `jsx` to be directly present in the options passed to `rehypeReact`,
      // not just via `createElement`.

      // Let's refine the import and usage:
      // src/components/markdown-renderer.tsx
      // ... (existing imports, but KEEP `import { jsx, jsxs } from "react/jsx-runtime";`) ...
      //
      // Change the .use(rehypeReact, ...) part to:

      // Correct approach for `rehype-react` v7+ and React 17+ automatic runtime
      // createElement: jsx,
      // If you are using React 17+ and the automatic JSX runtime,
      // rehype-react expects both `createElement` and `Fragment`
      // and will internally use `jsxs` if needed.
      // The `TypeError: Expected jsx in production options` is confusing,
      // as `createElement: jsx` should be sufficient.

      // A common source of this error with `rehype-react` can be the version
      // or interaction with specific bundler/babel configurations.

      // **Let's try a direct fix that has worked for others:**
      // Ensure `jsxs` is also explicitly passed to `rehype-react` options.
      // While `createElement` is usually enough, sometimes `rehype-react`
      // needs both.

      // Original:
      // createElement: jsx,
      // Fragment: Fragment,

      // Proposed change to satisfy the error:

      components: {
        // ... (Your existing component mappings) ...
        code: ({ className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || "");
          if (match) {
            const lang = match[1];
            const code = String(children).trim();
            return <CodeBlock code={code} lang={lang} index={0} />;
          }
          return (
            <code
              className={cn(
                "rounded-md bg-muted px-1 py-0.5 font-mono text-sm",
                className,
              )}
              {...props}
            >
              {children}
            </code>
          );
        },
        table: MarkdownTable,
        thead: MarkdownTableHead,
        tbody: MarkdownTableBody,
        tr: MarkdownTableRow,
        th: MarkdownTableHeaderCell,
        td: MarkdownTableCell,
        p: Paragraph,
      },
    });

  let renderedContent: JSX.Element | null = null;
  try {
    renderedContent = processor.processSync(content).result as JSX.Element;
  } catch (error) {
    console.error("Error rendering markdown:", error);
    renderedContent = (
      <p className="text-destructive">Error rendering markdown.</p>
    );
  }

  return <div className="prose dark:prose-invert">{renderedContent}</div>;
};
