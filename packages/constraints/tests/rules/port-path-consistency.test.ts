import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";
import { portPathConsistencyRule } from "../../src/rules/port-path-consistency";

const base = (overrides: Partial<ArchitextSpec> = {}): ArchitextSpec => ({
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Test", slug: "test" },
  groups: [],
  services: [],
  edges: [],
  ...overrides,
});

describe("portPathConsistencyRule", () => {
  it("produces no diagnostics when edge port matches entry-point component port", () => {
    const spec = base({
      services: [
        { id: "src", name: "Src", kind: "backend-service", components: [] },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [{ id: "ep", category: "entry-point", config: { port: 8080 } }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http", port: 8080 }],
    });
    expect(portPathConsistencyRule(spec)).toEqual([]);
  });

  it("produces no diagnostics when edge has no port field", () => {
    const spec = base({
      services: [
        { id: "src", name: "Src", kind: "backend-service", components: [] },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [{ id: "ep", category: "entry-point", config: { port: 8080 } }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http" }],
    });
    expect(portPathConsistencyRule(spec)).toEqual([]);
  });

  it("produces no diagnostics when target has no entry-point component", () => {
    const spec = base({
      services: [
        { id: "src", name: "Src", kind: "backend-service", components: [] },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [{ id: "fw", category: "framework" }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http", port: 3000 }],
    });
    expect(portPathConsistencyRule(spec)).toEqual([]);
  });

  it("emits a warning for HTTP edge port 3000 vs entry-point port 8080", () => {
    const spec = base({
      services: [
        { id: "src", name: "Src", kind: "backend-service", components: [] },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [{ id: "ep", category: "entry-point", config: { port: 8080 } }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http", port: 3000 }],
    });
    const diagnostics = portPathConsistencyRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "warning",
      code: "edge.port-mismatch",
      location: { edgeId: "e1", serviceId: "tgt" },
    });
  });

  it("emits a warning for gRPC edge port 50051 vs entry-point port 9090", () => {
    const spec = base({
      services: [
        { id: "src", name: "Src", kind: "backend-service", components: [] },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [{ id: "ep", category: "entry-point", config: { port: 9090 } }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "grpc", port: 50051 }],
    });
    const diagnostics = portPathConsistencyRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "warning",
      code: "edge.port-mismatch",
      location: { edgeId: "e1", serviceId: "tgt" },
    });
  });
});
