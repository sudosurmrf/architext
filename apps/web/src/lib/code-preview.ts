/**
 * @module @architext/web/lib/code-preview
 * Concepts: [[CodePreview]], [[AgentBrief]], [[TokenEstimation]], [[AnthropicAPI]], [[CacheInvalidation]]
 * Spec: Section 4.6 Side panel - Code tab with compiled service context and optional preview
 * Depends on: [[@architext/schema]] (ArchitextSpec, Service, Edge)
 * Consumed by: [[CodeTab]]
 */

import type { ArchitextSpec, BusinessContext, Service, Edge } from "@architext/schema";

const cache = new Map<string, string>();

export function getCached(key: string): string | undefined {
  return cache.get(key);
}

export function setCache(key: string, code: string): void {
  cache.set(key, code);
}

export function cacheKey(service: Service, edges: Edge[]): string {
  return JSON.stringify({
    id: service.id,
    name: service.name,
    kind: service.kind,
    description: service.description,
    businessContext: service.businessContext,
    components: service.components,
    contracts: service.contracts,
    edges,
  });
}

export function estimateTokens(prompt: string): number {
  return Math.ceil(prompt.length / 4);
}

export function buildServiceAgentBrief(
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
      if (c.config) parts.push(` config=${JSON.stringify(c.config)}`);
      const context = c.businessContext ? `\n${formatBusinessContext(c.businessContext, "    ")}` : "";
      return `${parts.join("")}${context}`;
    })
    .join("\n");

  const inboundLines =
    inbound.length > 0
      ? inbound.map((e) => formatEdgeBriefLine(e, `from ${e.from}`)).join("\n")
      : "  (none)";

  const outboundLines =
    outbound.length > 0
      ? outbound.map((e) => formatEdgeBriefLine(e, `to ${e.to}`)).join("\n")
      : "  (none)";

  const contractLines =
    service.contracts && service.contracts.length > 0
      ? service.contracts.map(formatServiceContract).join("\n")
      : "  (none)";

  return `Agent brief for "${spec.project.name}" (slug: ${spec.project.slug})

Project business context:
${formatBusinessContext(spec.project.businessContext, "  ")}

Service: ${service.name}
Kind: ${service.kind}
Description: ${service.description ?? "(none)"}
Business context:
${formatBusinessContext(service.businessContext, "  ")}

Components:
${componentLines || "  (none)"}

Inbound connections:
${inboundLines}

Outbound connections:
${outboundLines}

Service contracts:
${contractLines}`;
}

function formatServiceContract(contract: NonNullable<Service["contracts"]>[number]): string {
  const lines = [`  - ${contract.name} (${contract.direction})`];
  if (contract.edgeId) lines.push(`    edge: ${contract.edgeId}`);
  if (contract.contentType) lines.push(`    contentType: ${contract.contentType}`);
  if (contract.schema) lines.push(`    schema: ${contract.schema}`);
  if (contract.notes) lines.push(`    notes: ${contract.notes}`);
  if (contract.businessContext) lines.push(formatBusinessContext(contract.businessContext, "    "));
  return lines.join("\n");
}

function formatEdgeBriefLine(edge: Edge, target: string): string {
  const context = edge.businessContext ? `\n${formatBusinessContext(edge.businessContext, "    ")}` : "";
  return `  - ${target} via ${formatEdgeProtocol(edge)}${context}`;
}

function formatBusinessContext(context: BusinessContext | undefined, indent: string): string {
  if (!context) return `${indent}(none)`;

  const lines: string[] = [];
  if (context.purpose) lines.push(`${indent}purpose: ${context.purpose}`);
  appendList(lines, "businessRules", context.businessRules, indent);
  appendList(lines, "inputs", context.inputs, indent);
  appendList(lines, "outputs", context.outputs, indent);
  appendList(lines, "edgeCases", context.edgeCases, indent);
  appendList(lines, "acceptanceCriteria", context.acceptanceCriteria, indent);
  if (context.notes) lines.push(`${indent}notes: ${context.notes}`);

  return lines.length > 0 ? lines.join("\n") : `${indent}(none)`;
}

function appendList(lines: string[], label: string, values: readonly string[] | undefined, indent: string): void {
  if (!values || values.length === 0) return;
  lines.push(`${indent}${label}:`);
  for (const value of values) {
    lines.push(`${indent}  - ${value}`);
  }
}

function formatEdgeProtocol(edge: Edge): string {
  const details: string[] = [];
  switch (edge.protocol) {
    case "http":
      if (edge.basePath) details.push(`basePath=${edge.basePath}`);
      if (edge.port) details.push(`port=${edge.port}`);
      break;
    case "graphql":
      if (edge.path) details.push(`path=${edge.path}`);
      if (edge.port) details.push(`port=${edge.port}`);
      break;
    case "grpc":
      if (edge.port) details.push(`port=${edge.port}`);
      break;
    case "websocket":
      if (edge.path) details.push(`path=${edge.path}`);
      if (edge.port) details.push(`port=${edge.port}`);
      break;
    case "queue":
      details.push(`topic=${edge.topicName}`);
      if (edge.broker) details.push(`broker=${edge.broker}`);
      break;
    case "sql":
      if (edge.database) details.push(`database=${edge.database}`);
      if (edge.port) details.push(`port=${edge.port}`);
      break;
    case "key-value":
      if (edge.namespace) details.push(`namespace=${edge.namespace}`);
      break;
    case "fs":
      if (edge.mountPath) details.push(`mountPath=${edge.mountPath}`);
      break;
    case "event":
      if (edge.eventBus) details.push(`bus=${edge.eventBus}`);
      if (edge.source) details.push(`source=${edge.source}`);
      if (edge.detailType) details.push(`detailType=${edge.detailType}`);
      break;
    case "object-storage":
      if (edge.bucket) details.push(`bucket=${edge.bucket}`);
      if (edge.prefix) details.push(`prefix=${edge.prefix}`);
      break;
    case "identity":
      if (edge.provider) details.push(`provider=${edge.provider}`);
      if (edge.scopes) details.push(`scopes=${edge.scopes.join(",")}`);
      break;
    case "secret":
      if (edge.namespace) details.push(`namespace=${edge.namespace}`);
      break;
    case "container-image":
      if (edge.repository) details.push(`repository=${edge.repository}`);
      if (edge.tag) details.push(`tag=${edge.tag}`);
      break;
    case "lambda-invoke":
      if (edge.functionName) details.push(`function=${edge.functionName}`);
      if (edge.invocationType) details.push(`invocation=${edge.invocationType}`);
      if (edge.qualifier) details.push(`qualifier=${edge.qualifier}`);
      if (edge.endpointVisibility) details.push(`endpoint=${edge.endpointVisibility}`);
      if (edge.authorizer) details.push(`authorizer=${edge.authorizer}`);
      break;
    case "human-review":
      if (edge.reviewType) details.push(`review=${edge.reviewType}`);
      if (edge.assignee) details.push(`assignee=${edge.assignee}`);
      if (edge.sla) details.push(`sla=${edge.sla}`);
      if (edge.instructions) details.push(`instructions=${edge.instructions}`);
      break;
    case "decision":
      if (edge.condition) details.push(`condition=${edge.condition}`);
      if (edge.branchLabel) details.push(`branch=${edge.branchLabel}`);
      if (edge.fallback !== undefined) details.push(`fallback=${edge.fallback}`);
      break;
    case "dns":
      if (edge.domainName) details.push(`domain=${edge.domainName}`);
      if (edge.recordType) details.push(`recordType=${edge.recordType}`);
      break;
  }

  return details.length > 0 ? `${edge.protocol} (${details.join(", ")})` : edge.protocol;
}

export function buildServicePrompt(
  service: Service,
  relatedEdges: Edge[],
  spec: ArchitextSpec,
): string {
  return `${buildServiceAgentBrief(service, relatedEdges, spec)}

Instructions:
- Generate only idiomatic boilerplate - entry points, configuration, and wiring.
- Do NOT generate a full scaffold (no package managers, no CI, no README).
- Use the components listed above to determine language, framework, and libraries.
- Include connection setup for each inbound/outbound edge based on its protocol.
- Add brief inline comments explaining each section.
- Return a single fenced code block with the filename as a comment on the first line.`;
}

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
