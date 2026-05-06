/**
 * @module @architext/web/panel/SpecTab
 * Concepts: [[LiveJSON]], [[SyntaxHighlighting]], [[ShikiHighlighter]]
 * Spec: §4.6 Side panel — Spec tab (live pretty-printed JSON with syntax highlighting)
 * Depends on: [[spec-store]] (spec), shiki (syntax highlighting)
 * Consumed by: [[SidePanel]] (tab content)
 */

import { useState, useEffect } from "react";
import { useSpecStore } from "../store/spec-store";
import type { Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | undefined;

function getHighlighterSingleton(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then((mod) =>
      mod.createHighlighter({
        themes: ["github-light"],
        langs: ["json"],
      })
    );
  }
  return highlighterPromise;
}

export function SpecTab() {
  const spec = useSpecStore((s) => s.spec);
  const jsonString = JSON.stringify(spec, null, 2);

  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getHighlighterSingleton().then((highlighter) => {
      if (cancelled) return;
      const html = highlighter.codeToHtml(jsonString, {
        lang: "json",
        theme: "github-light",
      });
      setHighlightedHtml(html);
    });

    return () => {
      cancelled = true;
    };
  }, [jsonString]);

  return (
    <div className="p-3">
      <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-auto max-h-[calc(100vh-200px)]">
        {highlightedHtml ? (
          <div
            className="p-3 text-xs leading-relaxed [&_pre]:!bg-transparent [&_code]:!bg-transparent"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <pre className="p-3 text-xs font-mono text-gray-700 whitespace-pre">
            {jsonString}
          </pre>
        )}
      </div>
    </div>
  );
}
