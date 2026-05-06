import { describe, it, expect } from "vitest";
import {
  buildServicePrompt,
  estimateTokens,
  cacheKey,
} from "../src/lib/code-preview";
import type { ArchitextSpec, Service, Edge } from "@architext/schema";

function makeSpec(overrides?: Partial<ArchitextSpec>): ArchitextSpec {
  return {
    schemaVersion: "0.1.0",
    project: { name: "TestProject", slug: "test-project" },
    groups: [],
    services: [],
    edges: [],
    ...overrides,
  };
}

function makeService(overrides?: Partial<Service>): Service {
  return {
    id: "svc-api",
    name: "API Service",
    kind: "backend-service",
    position: { x: 0, y: 0 },
    components: [
      { id: "comp-ts", category: "language", version: "5.4" },
      { id: "comp-express", category: "framework" },
    ],
    ...overrides,
  };
}

function makeEdge(overrides?: Partial<Edge>): Edge {
  return {
    id: "edge-1",
    from: "svc-web",
    to: "svc-api",
    protocol: "http",
    ...overrides,
  } as Edge;
}

describe("buildServicePrompt", () => {
  it("includes the service name and component ids", () => {
    const service = makeService();
    const spec = makeSpec({ services: [service] });
    const prompt = buildServicePrompt(service, [], spec);

    expect(prompt).toContain("API Service");
    expect(prompt).toContain("comp-ts");
    expect(prompt).toContain("comp-express");
  });

  it("includes related edges' protocols", () => {
    const service = makeService();
    const inboundEdge = makeEdge({
      id: "edge-http",
      from: "svc-web",
      to: "svc-api",
      protocol: "http",
    });
    const outboundEdge = makeEdge({
      id: "edge-sql",
      from: "svc-api",
      to: "svc-db",
      protocol: "sql",
    } as Edge);
    const spec = makeSpec({ services: [service], edges: [inboundEdge, outboundEdge] });
    const prompt = buildServicePrompt(service, [inboundEdge, outboundEdge], spec);

    expect(prompt).toContain("via http");
    expect(prompt).toContain("via sql");
  });
});

describe("estimateTokens", () => {
  it("returns chars/4 rounded up", () => {
    // 10 chars / 4 = 2.5 → ceil → 3
    expect(estimateTokens("1234567890")).toBe(3);
    // 4 chars / 4 = 1.0 → ceil → 1
    expect(estimateTokens("abcd")).toBe(1);
    // 5 chars / 4 = 1.25 → ceil → 2
    expect(estimateTokens("hello")).toBe(2);
    // empty string → 0
    expect(estimateTokens("")).toBe(0);
  });
});

describe("cacheKey", () => {
  it("is deterministic — same input produces same output", () => {
    const service = makeService();
    const edges = [makeEdge()];
    const key1 = cacheKey(service, edges);
    const key2 = cacheKey(service, edges);
    expect(key1).toBe(key2);
  });

  it("changes when a component is added", () => {
    const service1 = makeService();
    const service2 = makeService({
      components: [
        ...service1.components,
        { id: "comp-redis", category: "datastore" },
      ],
    });
    const edges = [makeEdge()];
    expect(cacheKey(service1, edges)).not.toBe(cacheKey(service2, edges));
  });

  it("changes when an edge is added", () => {
    const service = makeService();
    const edges1 = [makeEdge()];
    const edges2 = [
      makeEdge(),
      makeEdge({ id: "edge-grpc", from: "svc-api", to: "svc-worker", protocol: "grpc" } as Edge),
    ];
    expect(cacheKey(service, edges1)).not.toBe(cacheKey(service, edges2));
  });
});
