import { useSuspenseQuery } from "@tanstack/react-query";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, Suspense, useEffect, useState, type JSX } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import {
  createHighlighter,
  createJavaScriptRegexEngine,
  type BundledLanguage,
  type Highlighter,
} from "shiki";

const LANGS: BundledLanguage[] = [
  "diff",
  "javascript",
  "typescript",
  "csharp",
  "jsx",
  "tsx",
  "html",
  "css",
  "python",
  "java",
  "go",
  "rust",
  "cpp",
  "c",
  "shell",
  "bash",
  "sql",
  "json",
  "xml",
  "svelte",
  "vue",
  "php",
];

const THEME = "catppuccin-latte";

let highlighter: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

export function HighlightedCode({
  content,
  lang,
}: {
  content: string;
  lang: string;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return fallbackElement(content);
  }

  return (
    <Suspense fallback={fallbackElement(content)}>
      <HighlightedCodeInner content={content} lang={lang} />
    </Suspense>
  );
}

function HighlightedCodeInner({
  content,
  lang,
}: {
  content: string;
  lang: string;
}) {
  const highlightedHTML = useSuspenseQuery({
    queryKey: ["highlight", content, lang],
    queryFn: () => highlightCode(content, lang),
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });

  return highlightedHTML.data;
}

const initHighlighter = async () => {
  if (highlighter) return highlighter;

  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: LANGS,
      engine: createJavaScriptRegexEngine({
        forgiving: true,
        target: "ES2018",
      }),
    });
  }

  highlighter = await highlighterPromise;
  return highlighter;
};

const fallbackElement = (code: string) => (
  <pre className="overflow-x-auto rounded-lg border bg-gray-100 p-4 dark:bg-gray-900">
    <code>{code}</code>
  </pre>
);

const highlightCode = async (
  code: string,
  lang: string,
): Promise<JSX.Element> => {
  try {
    const shiki = await initHighlighter();

    if (!shiki.getLoadedLanguages().includes(lang as BundledLanguage)) {
      await shiki.loadLanguage(lang as BundledLanguage);
    }

    const out = shiki.codeToHast(code, {
      lang: lang || "text",
      theme: THEME,
      transformers: [
        {
          pre(node) {
            node.properties.style = "";
            node.properties.className = [
              "shiki",
              "not-prose",
              "relative",
              "bg-chat-accent",
              "text-sm",
              "font-[450]",
              "text-secondary-foreground",
              "[&_pre]:overflow-auto",
              "[&_pre]:!bg-transparent",
              "[&_pre]:px-[1em]",
              "[&_pre]:py-[1em]",
            ];
          },
        },
      ],
    });

    return toJsxRuntime(out, {
      Fragment,
      jsx,
      jsxs,
    }) as JSX.Element;
  } catch {
    return fallbackElement(code);
  }
};
