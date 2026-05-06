import { describe, it, expect } from "vitest";
import {
  applyNodePositionChanges,
  applyNodeDimensionChanges,
  applyNodeRemovals,
  applyEdgeRemovals,
} from "../src/lib/from-react-flow";
import type { ArchitextSpec } from "@architext/schema";

function makeSpec(overrides?: Partial<ArchitextSpec>): ArchitextSpec {
  return {
    schemaVersion: "0.1.0",
    project: { name: "Test", slug: "test" },
    groups: [],
    services: [],
    edges: [],
    ...overrides,
  };
}

describe("applyNodePositionChanges", () => {
  it("updates positions for moved services", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "s2", name: "db", kind: "database", position: { x: 100, y: 100 }, components: [] },
      ],
    });
    const changes = [
      { id: "s1", position: { x: 50, y: 75 } },
      { id: "s2", position: { x: 200, y: 200 } },
    ];
    const result = applyNodePositionChanges(spec, changes);
    expect(result.services[0]!.position).toEqual({ x: 50, y: 75 });
    expect(result.services[1]!.position).toEqual({ x: 200, y: 200 });
  });

  it("updates positions for moved groups", () => {
    const spec = makeSpec({
      groups: [
        { id: "g1", name: "G1", kind: "backend", serviceIds: [], position: { x: 0, y: 0 }, size: { width: 400, height: 300 } },
      ],
    });
    const changes = [{ id: "g1", position: { x: 10, y: 20 } }];
    const result = applyNodePositionChanges(spec, changes);
    expect(result.groups[0]!.position).toEqual({ x: 10, y: 20 });
  });

  it("does not mutate the original spec", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
      ],
    });
    applyNodePositionChanges(spec, [{ id: "s1", position: { x: 50, y: 75 } }]);
    expect(spec.services[0]!.position).toEqual({ x: 0, y: 0 });
  });

  it("ignores changes for unknown node ids", () => {
    const spec = makeSpec();
    const result = applyNodePositionChanges(spec, [{ id: "unknown", position: { x: 0, y: 0 } }]);
    expect(result).toEqual(spec);
  });
});

describe("applyNodeDimensionChanges", () => {
  it("updates group dimensions", () => {
    const spec = makeSpec({
      groups: [
        { id: "g1", name: "G1", kind: "backend", serviceIds: [], position: { x: 0, y: 0 }, size: { width: 400, height: 300 } },
      ],
    });
    const changes = [{ id: "g1", dimensions: { width: 500, height: 400 } }];
    const result = applyNodeDimensionChanges(spec, changes);
    expect(result.groups[0]!.size).toEqual({ width: 500, height: 400 });
  });
});

describe("applyNodeRemovals", () => {
  it("removes services and their edges", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "s2", name: "db", kind: "database", position: { x: 200, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "s1", to: "s2", protocol: "sql" as const }],
    });
    const result = applyNodeRemovals(spec, ["s1"]);
    expect(result.services).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });
});

describe("applyEdgeRemovals", () => {
  it("removes edges by id", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "s2", name: "db", kind: "database", position: { x: 200, y: 0 }, components: [] },
      ],
      edges: [
        { id: "e1", from: "s1", to: "s2", protocol: "sql" as const },
        { id: "e2", from: "s1", to: "s2", protocol: "http" as const },
      ],
    });
    const result = applyEdgeRemovals(spec, ["e1"]);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]!.id).toBe("e2");
  });
});
