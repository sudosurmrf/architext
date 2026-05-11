import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";
import { contractSchemaMatchRule } from "../../src/rules/contract-schema-match";

const base = (overrides: Partial<ArchitextSpec> = {}): ArchitextSpec => ({
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Test", slug: "test" },
  groups: [],
  services: [],
  edges: [],
  ...overrides,
});

describe("contractSchemaMatchRule", () => {
  it("produces no diagnostics when both sides have matching schemas", () => {
    const spec = base({
      services: [
        {
          id: "src",
          name: "Src",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c1", name: "Out", direction: "outbound", edgeId: "e1", schema: "UserPayload" }],
        },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c2", name: "In", direction: "inbound", edgeId: "e1", schema: "UserPayload" }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http" }],
    });
    expect(contractSchemaMatchRule(spec)).toEqual([]);
  });

  it("produces no diagnostics when neither side has a schema", () => {
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
    expect(contractSchemaMatchRule(spec)).toEqual([]);
  });

  it("produces no diagnostics when contracts exist but have no edgeId linking them to the edge", () => {
    const spec = base({
      services: [
        {
          id: "src",
          name: "Src",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c1", name: "Out", direction: "outbound", schema: "TypeA" }],
        },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c2", name: "In", direction: "inbound", schema: "TypeB" }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http" }],
    });
    expect(contractSchemaMatchRule(spec)).toEqual([]);
  });

  it("emits a warning when source schema is UserPayload but target schema is UserDTO", () => {
    const spec = base({
      services: [
        {
          id: "src",
          name: "Src",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c1", name: "Out", direction: "outbound", edgeId: "e1", schema: "UserPayload" }],
        },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c2", name: "In", direction: "inbound", edgeId: "e1", schema: "UserDTO" }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http" }],
    });
    const diagnostics = contractSchemaMatchRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "warning",
      code: "edge.contract-schema-mismatch",
      location: { edgeId: "e1" },
    });
  });

  it("emits an info diagnostic when source has schema but target inbound contract has no schema", () => {
    const spec = base({
      services: [
        {
          id: "src",
          name: "Src",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c1", name: "Out", direction: "outbound", edgeId: "e1", schema: "UserPayload" }],
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
    const diagnostics = contractSchemaMatchRule(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "info",
      code: "edge.contract-schema-one-sided",
      location: { edgeId: "e1" },
    });
  });

  it("does not emit diagnostics when contracts edgeId does not match the edge", () => {
    const spec = base({
      services: [
        {
          id: "src",
          name: "Src",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c1", name: "Out", direction: "outbound", edgeId: "other-edge", schema: "TypeA" }],
        },
        {
          id: "tgt",
          name: "Tgt",
          kind: "backend-service",
          components: [],
          contracts: [{ id: "c2", name: "In", direction: "inbound", edgeId: "other-edge", schema: "TypeB" }],
        },
      ],
      edges: [{ id: "e1", from: "src", to: "tgt", protocol: "http" }],
    });
    expect(contractSchemaMatchRule(spec)).toEqual([]);
  });
});
