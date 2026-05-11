import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";
import { missingContractsRule } from "../../src/rules/missing-contracts";

const base = (overrides: Partial<ArchitextSpec> = {}): ArchitextSpec => ({
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Test", slug: "test" },
  groups: [],
  services: [],
  edges: [],
  ...overrides,
});

describe("missingContractsRule", () => {
  it("produces no diagnostics when both services have contracts linked to the edge", () => {
    const spec = base({
      services: [
        {
          id: "src",
          name: "Src",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c1", name: "Out", direction: "outbound", edgeId: "e1" }],
        },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c2", name: "In", direction: "inbound", edgeId: "e1" }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http" }],
    });
    expect(missingContractsRule(spec)).toEqual([]);
  });

  it("produces no diagnostics when only source service has a contract linked to the edge", () => {
    const spec = base({
      services: [
        {
          id: "src",
          name: "Src",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c1", name: "Out", direction: "outbound", edgeId: "e1" }],
        },
        { id: "tgt", name: "Tgt", kind: "backend-service", components: [] },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http" }],
    });
    expect(missingContractsRule(spec)).toEqual([]);
  });

  it("emits an info diagnostic when neither service has any contract linked to the edge", () => {
    const spec = base({
      services: [
        { id: "src", name: "Src", kind: "backend-service", components: [] },
        { id: "tgt", name: "Tgt", kind: "backend-service", components: [] },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http" }],
    });
    const diagnostics = missingContractsRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "info",
      code: "edge.missing-contracts",
      location: { edgeId: "e1" },
    });
  });

  it("only flags the undocumented edge when spec has multiple edges", () => {
    const spec = base({
      services: [
        {
          id: "a",
          name: "A",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c1", name: "Out", direction: "outbound", edgeId: "e1" }],
        },
        { id: "b", name: "B", kind: "backend-service", components: [] },
        { id: "c", name: "C", kind: "backend-service", components: [] },
      ],
      edges: [
        { id: "e1", from: "a", to: "b", protocol: "http" },
        { id: "e2", from: "b", to: "c", protocol: "http" },
      ],
    });
    const diagnostics = missingContractsRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "info",
      code: "edge.missing-contracts",
      location: { edgeId: "e2" },
    });
  });
});
