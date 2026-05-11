import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";
import { protocolKindCompatRule } from "../../src/rules/protocol-kind-compat";

const base = (overrides: Partial<ArchitextSpec> = {}): ArchitextSpec => ({
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Test", slug: "test" },
  groups: [],
  services: [],
  edges: [],
  ...overrides,
});

describe("protocolKindCompatRule", () => {
  it("produces no diagnostics for sql edge targeting a database", () => {
    const spec = base({
      services: [
        { id: "api", name: "API", kind: "backend-service", components: [] },
        { id: "db", name: "DB", kind: "database", components: [] },
      ],
      edges: [{ id: "e1", from: "api", to: "db", protocol: "sql" }],
    });
    expect(protocolKindCompatRule(spec)).toEqual([]);
  });

  it("produces no diagnostics for queue edge where target is queue kind", () => {
    const spec = base({
      services: [
        { id: "worker", name: "Worker", kind: "worker", components: [] },
        { id: "q", name: "Q", kind: "queue", components: [] },
      ],
      edges: [{ id: "e1", from: "worker", to: "q", protocol: "queue", topicName: "jobs" }],
    });
    expect(protocolKindCompatRule(spec)).toEqual([]);
  });

  it("produces no diagnostics for human-review edge where source is human-step", () => {
    const spec = base({
      services: [
        { id: "human", name: "Human", kind: "human-step", components: [] },
        { id: "api", name: "API", kind: "backend-service", components: [] },
      ],
      edges: [{ id: "e1", from: "human", to: "api", protocol: "human-review" }],
    });
    expect(protocolKindCompatRule(spec)).toEqual([]);
  });

  it("produces no diagnostics for http edge (unrestricted)", () => {
    const spec = base({
      services: [
        { id: "api", name: "API", kind: "backend-service", components: [] },
        { id: "fe", name: "FE", kind: "frontend-app", components: [] },
      ],
      edges: [{ id: "e1", from: "api", to: "fe", protocol: "http" }],
    });
    expect(protocolKindCompatRule(spec)).toEqual([]);
  });

  it("emits an error for sql edge targeting a backend-service", () => {
    const spec = base({
      services: [
        { id: "api", name: "API", kind: "backend-service", components: [] },
        { id: "other", name: "Other", kind: "backend-service", components: [] },
      ],
      edges: [{ id: "e1", from: "api", to: "other", protocol: "sql" }],
    });
    const diagnostics = protocolKindCompatRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "edge.protocol-kind-mismatch",
      location: { edgeId: "e1" },
    });
    expect(diagnostics[0].suggestion).toBeTruthy();
  });

  it("emits an error for key-value edge targeting a database (should target cache)", () => {
    const spec = base({
      services: [
        { id: "api", name: "API", kind: "backend-service", components: [] },
        { id: "db", name: "DB", kind: "database", components: [] },
      ],
      edges: [{ id: "e1", from: "api", to: "db", protocol: "key-value" }],
    });
    const diagnostics = protocolKindCompatRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "edge.protocol-kind-mismatch",
      location: { edgeId: "e1" },
    });
    expect(diagnostics[0].suggestion).toBeTruthy();
  });

  it("emits an error for human-review edge between two backend-services", () => {
    const spec = base({
      services: [
        { id: "a", name: "A", kind: "backend-service", components: [] },
        { id: "b", name: "B", kind: "backend-service", components: [] },
      ],
      edges: [{ id: "e1", from: "a", to: "b", protocol: "human-review" }],
    });
    const diagnostics = protocolKindCompatRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "edge.protocol-kind-mismatch",
      location: { edgeId: "e1" },
    });
    expect(diagnostics[0].suggestion).toBeTruthy();
  });

  it("emits an error for decision edge between two workers", () => {
    const spec = base({
      services: [
        { id: "w1", name: "W1", kind: "worker", components: [] },
        { id: "w2", name: "W2", kind: "worker", components: [] },
      ],
      edges: [{ id: "e1", from: "w1", to: "w2", protocol: "decision" }],
    });
    const diagnostics = protocolKindCompatRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "edge.protocol-kind-mismatch",
      location: { edgeId: "e1" },
    });
    expect(diagnostics[0].suggestion).toBeTruthy();
  });
});
