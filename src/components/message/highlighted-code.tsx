import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import {
  Fragment,
  startTransition,
  useEffect,
  useState,
  type JSX,
} from "react";
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
const highlightedCodeCache = new Map<string, JSX.Element>();
const pendingHighlights = new Map<string, Promise<JSX.Element>>();

let highlighter: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

export function HighlightedCode({
  content,
  lang,
}: {
  content: string;
  lang: string;
}) {
  const cacheKey = `${lang}\u0000${content}`;
  const [highlighted, setHighlighted] = useState<JSX.Element | null>(
    highlightedCodeCache.get(cacheKey) ?? null,
  );

  useEffect(() => {
    if (!lang) {
      setHighlighted(null);
      return;
    }

    const cached = highlightedCodeCache.get(cacheKey);
    if (cached) {
      setHighlighted(cached);
      return;
    }

    setHighlighted(null);

    let cancelled = false;
    let pendingHighlight = pendingHighlights.get(cacheKey);

    if (!pendingHighlight) {
      pendingHighlight = highlightCode(content, lang).then((element) => {
        highlightedCodeCache.set(cacheKey, element);
        pendingHighlights.delete(cacheKey);
        return element;
      });
      pendingHighlights.set(cacheKey, pendingHighlight);
    }

    pendingHighlight.then((element) => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setHighlighted(element);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, content, lang]);

  if (!highlighted) {
    return fallbackElement(content);
  }

  return highlighted;
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
  <pre className="overflow-x-auto px-[1em] py-[1em]">
    <code>{code}</code>
  </pre>
);

const highlightCode = async (
  code: string,
  lang: string,
): Promise<JSX.Element> => {
  try {
    if (!lang) {
      return fallbackElement(code);
    }

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
            node.properties.className = ["shiki"];
          },
        },
      ],
    });

    return toJsxRuntime(out, {
      Fragment,
      jsx,
      jsxs,
    }) as JSX.Element;
  } catch (error) {
    console.error("Failed to highlight code:", { lang, error });
    return fallbackElement(code);
  }
};
