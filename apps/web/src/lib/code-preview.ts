/**
 * @module @architext/web/lib/code-preview
 * Concepts: [[CodePreview]], [[TokenEstimation]], [[AnthropicAPI]], [[CacheInvalidation]]
 * Spec: §4.6 Side panel — Code tab (on-demand agent call per service)
 * Depends on: [[@architext/schema]] (ArchitextSpec, Service, Edge)
 * Consumed by: [[CodeTab]]
 */

import type { ArchitextSpec, Service, Edge } from "@architext/schema";

// ─── In-memory cache ────────────────────────────────────────────────────────

const cache = new Map<string, string>();

export function getCached(key: string): string | undefined {
  return cache.get(key);
}

export function setCache(key: string, code: string): void {
  cache.set(key, code);
}

// ─── Cache key ──────────────────────────────────────────────────────────────

export function cacheKey(service: Service, edges: Edge[]): string {
  return JSON.stringify({
    id: service.id,
    components: service.components,
    edges: edges.map((e) => ({ id: e.id, protocol: e.protocol })),
  });
}

// ─── Token estimation ───────────────────────────────────────────────────────

export function estimateTokens(prompt: string): number {
  return Math.ceil(prompt.length / 4);
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

export function buildServicePrompt(
  service: Service,
  relatedEdges: Edge[],
  spec: ArchitextSpec,
): string {
  const inbound = relatedEdges.filter((e) => e.to === service.id);
  const outbound = relatedEdges.filter((e) => e.from === service.id);

  const componentLines = service.components
    .map((c) => {
      const parts = [`  - ${c.id} (${c.category})`];
      if (c.version) parts.push(` v${c.version}`);
      return parts.join("");
    })
    .join("\n");

  const inboundLines =
    inbound.length > 0
      ? inbound
          .map((e) => `  - from ${e.from} via ${e.protocol}`)
          .join("\n")
      : "  (none)";

  const outboundLines =
    outbound.length > 0
      ? outbound
          .map((e) => `  - to ${e.to} via ${e.protocol}`)
          .join("\n")
      : "  (none)";

  return `You are a senior software architect. Generate idiomatic boilerplate code for the following service in the "${spec.project.name}" project (slug: ${spec.project.slug}).

Service: ${service.name}
Kind: ${service.kind}

Components:
${componentLines || "  (none)"}

Inbound connections:
${inboundLines}

Outbound connections:
${outboundLines}

Instructions:
- Generate only idiomatic boilerplate — entry points, configuration, and wiring.
- Do NOT generate a full scaffold (no package managers, no CI, no README).
- Use the components listed above to determine language, framework, and libraries.
- Include connection setup for each inbound/outbound edge based on its protocol.
- Add brief inline comments explaining each section.
- Return a single fenced code block with the filename as a comment on the first line.`;
}

// ─── API call ───────────────────────────────────────────────────────────────

export async function generatePreview(
  prompt: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401) {
      throw new Error("Invalid API key. Please check your Anthropic API key and try again.");
    }
    if (status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    if (status >= 500) {
      throw new Error("Anthropic API is temporarily unavailable. Please try again later.");
    }
    const body = await response.text().catch(() => "");
    throw new Error(`API error (${status}): ${body || response.statusText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find(
    (block: { type: string }) => block.type === "text",
  );
  if (!textBlock) {
    throw new Error("No text content in API response.");
  }
  return textBlock.text;
}
