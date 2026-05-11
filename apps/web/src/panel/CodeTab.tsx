/**
 * @module @architext/web/panel/CodeTab
 * Concepts: [[CodePreview]], [[OnDemand]], [[AgentCall]]
 * Spec: §4.6 Side panel — Code tab (on-demand button per service, shows estimated tokens)
 * Depends on: [[spec-store]] (spec.services, spec.edges), [[code-preview]]
 * Consumed by: [[SidePanel]] (tab content)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSpecStore } from "../store/spec-store";
import {
  buildServicePrompt,
  estimateTokens,
  cacheKey,
  getCached,
  setCache,
  generatePreview,
  buildServiceAgentBrief,
} from "../lib/code-preview";
import type { Service, Edge } from "@architext/schema";
import type { Highlighter } from "shiki";
import { buildWorkflowContractPreview } from "../lib/workflow-contract";

// ─── Shiki singleton (same pattern as SpecTab) ──────────────────────────────

let highlighterPromise: Promise<Highlighter> | undefined;

function getHighlighterSingleton(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then((mod) =>
      mod.createHighlighter({
        themes: ["github-light"],
        langs: ["typescript", "javascript", "python", "go", "rust", "json"],
      }),
    );
  }
  return highlighterPromise;
}

// ─── API key storage ────────────────────────────────────────────────────────

const API_KEY_STORAGE_KEY = "architext:api-key";

function loadApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } catch {
    // localStorage may be unavailable
  }
}

// ─── Per-service card ───────────────────────────────────────────────────────

interface ServiceCardProps {
  service: Service;
  relatedEdges: Edge[];
  apiKey: string;
}

function ServiceCard({ service, relatedEdges, apiKey }: ServiceCardProps) {
  const spec = useSpecStore((s) => s.spec);

  const key = useMemo(
    () => cacheKey(service, relatedEdges),
    [service, relatedEdges],
  );

  const prompt = useMemo(
    () => buildServicePrompt(service, relatedEdges, spec),
    [service, relatedEdges, spec],
  );
  const agentBrief = useMemo(
    () => buildServiceAgentBrief(service, relatedEdges, spec),
    [service, relatedEdges, spec],
  );

  const tokenEstimate = useMemo(() => estimateTokens(prompt), [prompt]);

  const [code, setCode] = useState<string | undefined>(() => getCached(key));
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invalidate cache when key changes
  useEffect(() => {
    const cached = getCached(key);
    setCode(cached);
    setHighlightedHtml(null);
    setError(null);
  }, [key]);

  // Highlight code when it changes
  useEffect(() => {
    if (!code) {
      setHighlightedHtml(null);
      return;
    }
    let cancelled = false;
    getHighlighterSingleton().then((highlighter) => {
      if (cancelled) return;
      // Detect language from the code block or default to typescript
      let lang = "typescript";
      const fenceMatch = code.match(/^```(\w+)/);
      if (fenceMatch && fenceMatch[1]) {
        const detected = fenceMatch[1].toLowerCase();
        const supported = ["typescript", "javascript", "python", "go", "rust", "json"];
        if (supported.includes(detected)) lang = detected;
      }
      // Strip markdown fences for highlighting
      const clean = code.replace(/^```\w*\n?/, "").replace(/\n?```\s*$/, "");
      const html = highlighter.codeToHtml(clean, {
        lang,
        theme: "github-light",
      });
      setHighlightedHtml(html);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setError("Please enter your API key above.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generatePreview(prompt, apiKey);
      setCache(key, result);
      setCode(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [apiKey, prompt, key]);

  const kindColors: Record<string, string> = {
    "frontend-app": "bg-blue-100 text-blue-700",
    "backend-service": "bg-green-100 text-green-700",
    worker: "bg-yellow-100 text-yellow-700",
    database: "bg-purple-100 text-purple-700",
    cache: "bg-orange-100 text-orange-700",
    queue: "bg-pink-100 text-pink-700",
    sidecar: "bg-gray-100 text-gray-700",
    "external-api": "bg-red-100 text-red-700",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-800 truncate">
            {service.name}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${kindColors[service.kind] ?? "bg-gray-100 text-gray-700"}`}
          >
            {service.kind}
          </span>
        </div>
        <span className="shrink-0 ml-2 text-xs text-gray-400">
          preview ~{tokenEstimate.toLocaleString()} tokens
        </span>
      </div>

      {/* Actions */}
      <div className="px-3 py-2">
        <button
          onClick={handleGenerate}
          disabled={loading || !apiKey}
          className={
            "w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
            (loading || !apiKey
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100")
          }
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Generating...
            </span>
          ) : code ? (
            "Regenerate"
          ) : (
            "Optional Browser Preview"
          )}
        </button>
      </div>

      <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
        <div className="mb-1 text-xs font-medium text-gray-600">Compiled Context</div>
        <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-md bg-white p-2 font-mono text-xs leading-relaxed text-gray-700">
          {agentBrief}
        </pre>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 pb-2">
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Code output */}
      {code && (
        <div className="border-t border-gray-100 overflow-auto max-h-80">
          {highlightedHtml ? (
            <div
              className="p-3 text-xs leading-relaxed [&_pre]:!bg-transparent [&_code]:!bg-transparent"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="p-3 text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">
              {code}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main CodeTab ───────────────────────────────────────────────────────────

export function CodeTab() {
  const spec = useSpecStore((s) => s.spec);
  const services = useSpecStore((s) => s.spec.services);
  const edges = useSpecStore((s) => s.spec.edges);

  const [apiKey, setApiKey] = useState(loadApiKey);
  const [showKey, setShowKey] = useState(false);

  const handleKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setApiKey(value);
      saveApiKey(value);
    },
    [],
  );
  const workflowPreview = useMemo(() => buildWorkflowContractPreview(spec), [spec]);

  // Map each service to its related edges
  const serviceEdges = useMemo(() => {
    const map = new Map<string, Edge[]>();
    for (const svc of services) {
      map.set(
        svc.id,
        edges.filter((e) => e.from === svc.id || e.to === svc.id),
      );
    }
    return map;
  }, [services, edges]);

  return (
    <div className="p-3 space-y-3">
      {/* API key banner — prominent when missing, compact when set */}
      {!apiKey ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800">
            API key required for code preview
          </p>
          <p className="text-xs text-amber-700 leading-snug">
            Optional browser previews use Anthropic directly. The real scaffold path is the local CLI contract.
          </p>
          <div className="flex gap-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={handleKeyChange}
              placeholder="sk-ant-..."
              className="flex-1 min-w-0 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs font-mono text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="shrink-0 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={handleKeyChange}
              placeholder="sk-ant-..."
              className="flex-1 min-w-0 rounded-md border border-gray-300 px-2 py-1.5 text-xs font-mono text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="shrink-0 rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-indigo-950">Workflow Contract</h3>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-indigo-700">
            {workflowPreview.completenessScore}% complete
          </span>
        </div>
        <div className="mb-2 grid grid-cols-4 gap-1 text-center text-xs">
          <div className="rounded-md bg-white px-1 py-1">
            <div className="font-semibold text-gray-800">{workflowPreview.manifest.nodes.length}</div>
            <div className="text-gray-500">nodes</div>
          </div>
          <div className="rounded-md bg-white px-1 py-1">
            <div className="font-semibold text-gray-800">{workflowPreview.manifest.agents.length}</div>
            <div className="text-gray-500">agents</div>
          </div>
          <div className="rounded-md bg-white px-1 py-1">
            <div className="font-semibold text-gray-800">{workflowPreview.manifest.decisions.length}</div>
            <div className="text-gray-500">branches</div>
          </div>
          <div className="rounded-md bg-white px-1 py-1">
            <div className="font-semibold text-gray-800">{workflowPreview.manifest.humanGates.length}</div>
            <div className="text-gray-500">gates</div>
          </div>
        </div>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-white p-2 font-mono text-xs leading-relaxed text-gray-700">
          {workflowPreview.json}
        </pre>
      </div>

      {/* Service cards */}
      <h3 className="text-sm font-medium text-gray-700">Agent Briefs</h3>
      {services.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500">
          Add services to preview code generation.
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              relatedEdges={serviceEdges.get(svc.id) ?? []}
              apiKey={apiKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
