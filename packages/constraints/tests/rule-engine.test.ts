import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";
import {
  runConstraints,
  edgeEndpointsExist,
  noDuplicateIds,
  groupReferencesExist,
  manifestCompletenessRule,
  type ConstraintRule,
} from "../src";

const EMPTY_SPEC: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Test", slug: "test" },
  groups: [],
  services: [],
  edges: [],
};

describe("runConstraints", () => {
  it("returns empty diagnostics when no rules are provided", () => {
    const diagnostics = runConstraints(EMPTY_SPEC, []);
    expect(diagnostics).toEqual([]);
  });

  it("is deterministic — same spec and rules produce identical output", () => {
    const rule: ConstraintRule = (spec) =>
      spec.services.map((s) => ({
        severity: "warning" as const,
        code: "test.check",
        message: `checking ${s.name}`,
        location: { serviceId: s.id },
      }));

    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Det", slug: "det" },
      groups: [],
      services: [
        { id: "a", name: "A", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "b", name: "B", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [],
    };

    const run1 = runConstraints(spec, [rule]);
    const run2 = runConstraints(spec, [rule]);
    expect(run1).toEqual(run2);
  });

  it("collects diagnostics from multiple rules and sorts errors before warnings before info", () => {
    const infoRule: ConstraintRule = () => [
      { severity: "info", code: "test.info", message: "info msg" },
    ];
    const errorRule: ConstraintRule = () => [
      { severity: "error", code: "test.error", message: "error msg" },
    ];
    const warningRule: ConstraintRule = () => [
      { severity: "warning", code: "test.warning", message: "warning msg" },
    ];

    const diagnostics = runConstraints(EMPTY_SPEC, [infoRule, errorRule, warningRule]);
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.map((d) => d.severity)).toEqual(["error", "warning", "info"]);
  });

  it("uses built-in rules by default when no rules array is passed", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Defaults", slug: "defaults" },
      groups: [],
      services: [],
      edges: [{ id: "e1", from: "nope", to: "nada", protocol: "http" }],
    };
    const diagnostics = runConstraints(spec);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((d) => d.code === "edge.endpoint-not-found")).toBe(true);
  });
});

describe("edgeEndpointsExist", () => {
  it("produces no diagnostics when all edge endpoints reference valid services", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Valid", slug: "valid" },
      groups: [],
      services: [
        { id: "a", name: "A", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "b", name: "B", kind: "database", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "a", to: "b", protocol: "sql" }],
    };
    expect(edgeEndpointsExist(spec)).toEqual([]);
  });

  it("reports errors for edges referencing nonexistent services", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Bad", slug: "bad" },
      groups: [],
      services: [
        { id: "a", name: "A", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "a", to: "ghost", protocol: "http" }],
    };
    const diagnostics = edgeEndpointsExist(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "edge.endpoint-not-found",
      location: { edgeId: "e1" },
    });
  });

  it("reports errors for both from and to when both are missing", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Both", slug: "both" },
      groups: [],
      services: [],
      edges: [{ id: "e1", from: "ghost-a", to: "ghost-b", protocol: "http" }],
    };
    const diagnostics = edgeEndpointsExist(spec);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.every((d) => d.severity === "error")).toBe(true);
  });
});

describe("noDuplicateIds", () => {
  it("produces no diagnostics when all IDs are unique", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Unique", slug: "unique" },
      groups: [{ id: "g1", name: "G", kind: "backend", serviceIds: ["s1"], position: { x: 0, y: 0 } }],
      services: [{ id: "s1", name: "S", kind: "backend-service", position: { x: 0, y: 0 }, components: [] }],
      edges: [{ id: "e1", from: "s1", to: "s1", protocol: "http" }],
    };
    expect(noDuplicateIds(spec)).toEqual([]);
  });

  it("reports errors when service IDs collide with edge IDs", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Dupe", slug: "dupe" },
      groups: [],
      services: [{ id: "shared", name: "S", kind: "backend-service", position: { x: 0, y: 0 }, components: [] }],
      edges: [{ id: "shared", from: "shared", to: "shared", protocol: "http" }],
    };
    const diagnostics = noDuplicateIds(spec);
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "spec.duplicate-id",
    });
  });

  it("reports errors when two services share the same ID", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Dupe", slug: "dupe" },
      groups: [],
      services: [
        { id: "dup", name: "A", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "dup", name: "B", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [],
    };
    const diagnostics = noDuplicateIds(spec);
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "spec.duplicate-id",
    });
  });
});

describe("groupReferencesExist", () => {
  it("produces no diagnostics when all group serviceIds reference real services", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "OK", slug: "ok" },
      groups: [{ id: "g1", name: "G", kind: "backend", serviceIds: ["s1"], position: { x: 0, y: 0 } }],
      services: [{ id: "s1", name: "S", kind: "backend-service", position: { x: 0, y: 0 }, components: [] }],
      edges: [],
    };
    expect(groupReferencesExist(spec)).toEqual([]);
  });

  it("reports errors when a group references a nonexistent service", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Bad", slug: "bad" },
      groups: [{ id: "g1", name: "G", kind: "backend", serviceIds: ["missing"], position: { x: 0, y: 0 } }],
      services: [],
      edges: [],
    };
    const diagnostics = groupReferencesExist(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "group.service-not-found",
      location: { groupId: "g1" },
    });
  });
});

describe("manifestCompletenessRule", () => {
  it("surfaces existing manifest validation diagnostics through the rule engine", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Gaps", slug: "gaps" },
      groups: [],
      services: [
        {
          id: "agent",
          name: "agent",
          kind: "ai-agent",
          position: { x: 0, y: 0 },
          components: [],
          contracts: [{ id: "payload", name: "Payload", direction: "inbound" }],
        },
        { id: "router", name: "router", kind: "decision", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "agent", to: "router", protocol: "decision" }],
    };

    const diagnostics = manifestCompletenessRule(spec);
    const codes = diagnostics.map((d) => d.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "contract.missing_schema",
        "decision.unnamed_branch",
        "agent.no_model",
        "agent.missing_purpose",
      ])
    );
  });

  it("is included in the default BUILT_IN_RULES", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Full", slug: "full" },
      groups: [],
      services: [
        {
          id: "agent",
          name: "agent",
          kind: "ai-agent",
          position: { x: 0, y: 0 },
          components: [],
        },
        { id: "model", name: "model", kind: "ai-model", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "agent", to: "model", protocol: "http" }],
    };

    const diagnostics = runConstraints(spec);
    expect(diagnostics.some((d) => d.code === "agent.missing_purpose")).toBe(true);
  });
});
