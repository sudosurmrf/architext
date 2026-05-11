import { describe, it, expect } from "vitest";
import {
  buildServicePrompt,
  buildServiceAgentBrief,
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

  it("includes edge config details that affect scaffold wiring", () => {
    const service = makeService();
    const edge = makeEdge({
      id: "edge-http",
      from: "svc-web",
      to: "svc-api",
      protocol: "http",
      port: 8080,
      basePath: "/v1",
    });
    const spec = makeSpec({ services: [service], edges: [edge] });
    const prompt = buildServicePrompt(service, [edge], spec);

    expect(prompt).toContain("basePath=/v1");
    expect(prompt).toContain("port=8080");
  });

  it("includes component config and cloud-native edge details", () => {
    const service = makeService({
      kind: "infrastructure",
      components: [
        {
          id: "aws-ecs-fargate",
          category: "infrastructure",
          config: { integrationPatterns: ["ALB routes to ECS"] },
        },
      ],
    });
    const edge = makeEdge({
      id: "edge-image",
      from: "svc-api",
      to: "svc-infra",
      protocol: "container-image",
      repository: "api",
      tag: "latest",
    } as Edge);
    const spec = makeSpec({ services: [service], edges: [edge] });
    const prompt = buildServicePrompt(service, [edge], spec);

    expect(prompt).toContain("config=");
    expect(prompt).toContain("ALB routes to ECS");
    expect(prompt).toContain("repository=api");
    expect(prompt).toContain("tag=latest");
  });

  it("formats object storage, identity, event, lambda invoke, human review, decision, secret, and dns edges", () => {
    const service = makeService();
    const edges = [
      makeEdge({ id: "event", protocol: "event", eventBus: "app", detailType: "created" } as Edge),
      makeEdge({ id: "object", protocol: "object-storage", bucket: "assets", prefix: "uploads/" } as Edge),
      makeEdge({ id: "identity", protocol: "identity", provider: "cognito", scopes: ["openid"] } as Edge),
      makeEdge({ id: "lambda", protocol: "lambda-invoke", functionName: "handler", invocationType: "request-response", endpointVisibility: "private", authorizer: "iam" } as Edge),
      makeEdge({ id: "human", protocol: "human-review", reviewType: "approval", assignee: "ops", sla: "4h" } as Edge),
      makeEdge({ id: "decision", protocol: "decision", condition: "confidence >= 0.8", branchLabel: "approved", fallback: false } as Edge),
      makeEdge({ id: "secret", protocol: "secret", namespace: "app" } as Edge),
      makeEdge({ id: "dns", protocol: "dns", domainName: "app.example.com", recordType: "A" } as Edge),
    ];
    const spec = makeSpec({ services: [service], edges });
    const prompt = buildServicePrompt(service, edges, spec);

    expect(prompt).toContain("bus=app");
    expect(prompt).toContain("bucket=assets");
    expect(prompt).toContain("provider=cognito");
    expect(prompt).toContain("function=handler");
    expect(prompt).toContain("endpoint=private");
    expect(prompt).toContain("review=approval");
    expect(prompt).toContain("branch=approved");
    expect(prompt).toContain("namespace=app");
    expect(prompt).toContain("domain=app.example.com");
  });

  it("includes service descriptions and payload contracts", () => {
    const service = makeService({
      description: "Owns task creation.",
      businessContext: {
        purpose: "Turn user-entered tasks into durable work items.",
      },
      components: [
        {
          id: "comp-ts",
          category: "language",
          businessContext: { purpose: "Keep request and response types explicit." },
        },
      ],
      contracts: [
        {
          id: "edge-http-inbound",
          name: "Create task request",
          edgeId: "edge-http",
          direction: "inbound",
          contentType: "application/json",
          schema: '{ "title": "string" }',
          businessContext: {
            inputs: ["Task title and optional due date"],
            acceptanceCriteria: ["Reject empty task titles"],
          },
        },
      ],
    });
    const edge = makeEdge({
      id: "edge-http",
      from: "svc-web",
      to: "svc-api",
      businessContext: { purpose: "Submit task creation requests from the UI." },
    });
    const spec = makeSpec({
      project: {
        name: "TestProject",
        slug: "test-project",
        businessContext: { purpose: "Coordinate work intake." },
      },
      services: [service],
      edges: [edge],
    });
    const prompt = buildServicePrompt(service, [edge], spec);

    expect(prompt).toContain("Owns task creation.");
    expect(prompt).toContain("Coordinate work intake.");
    expect(prompt).toContain("Turn user-entered tasks into durable work items.");
    expect(prompt).toContain("Keep request and response types explicit.");
    expect(prompt).toContain("Submit task creation requests from the UI.");
    expect(prompt).toContain("Create task request");
    expect(prompt).toContain('{ "title": "string" }');
    expect(prompt).toContain("Reject empty task titles");
  });
});

describe("buildServiceAgentBrief", () => {
  it("shows the compiled service context without preview instructions", () => {
    const service = makeService();
    const edge = makeEdge({ id: "edge-http", from: "svc-web", to: "svc-api" });
    const spec = makeSpec({ services: [service], edges: [edge] });
    const brief = buildServiceAgentBrief(service, [edge], spec);

    expect(brief).toContain("Agent brief");
    expect(brief).toContain("API Service");
    expect(brief).toContain("via http");
    expect(brief).not.toContain("Generate only idiomatic boilerplate");
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

  it("changes when edge configuration changes", () => {
    const service = makeService();
    const edges1 = [makeEdge({ port: 3000 } as Edge)];
    const edges2 = [makeEdge({ port: 8080 } as Edge)];
    expect(cacheKey(service, edges1)).not.toBe(cacheKey(service, edges2));
  });

  it("changes when business context changes", () => {
    const service1 = makeService();
    const service2 = makeService({
      businessContext: { purpose: "Own task writes." },
    });
    const edges = [makeEdge()];
    expect(cacheKey(service1, edges)).not.toBe(cacheKey(service2, edges));
  });
});
