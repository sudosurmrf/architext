import { describe, it, expect } from "vitest";
import { specToReactFlow, type RFGraph } from "../src/lib/to-react-flow";
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

describe("specToReactFlow", () => {
  it("returns empty arrays for empty spec", () => {
    const result = specToReactFlow(makeSpec());
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("converts a top-level service to an RF node", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 100, y: 200 }, components: [] },
      ],
    });
    const result = specToReactFlow(spec);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({
      id: "s1",
      type: "service",
      position: { x: 100, y: 200 },
      data: {
        name: "api",
        kind: "backend-service",
        components: [],
      },
    });
  });

  it("converts a group to a parent RF node", () => {
    const spec = makeSpec({
      groups: [
        { id: "g1", name: "Backend", kind: "backend", serviceIds: ["s1"], position: { x: 0, y: 0 }, size: { width: 400, height: 300 } },
      ],
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 50, y: 50 }, components: [], groupId: "g1" },
      ],
    });
    const result = specToReactFlow(spec);
    expect(result.nodes).toHaveLength(2);

    const groupNode = result.nodes.find((n) => n.id === "g1");
    expect(groupNode).toMatchObject({
      id: "g1",
      type: "group",
      position: { x: 0, y: 0 },
      data: { name: "Backend", kind: "backend" },
      style: { width: 400, height: 300 },
    });

    const serviceNode = result.nodes.find((n) => n.id === "s1");
    expect(serviceNode?.parentId).toBe("g1");
  });

  it("converts edges with protocol data", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "s2", name: "db", kind: "database", position: { x: 300, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "s1", to: "s2", protocol: "sql" as const }],
    });
    const result = specToReactFlow(spec);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      id: "e1",
      source: "s1",
      target: "s2",
      type: "protocol",
      data: { protocol: "sql" },
    });
  });

  it("groups are rendered before their children in node order", () => {
    const spec = makeSpec({
      groups: [
        { id: "g1", name: "G1", kind: "backend", serviceIds: ["s1"], position: { x: 0, y: 0 }, size: { width: 400, height: 300 } },
      ],
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 50, y: 50 }, components: [], groupId: "g1" },
      ],
    });
    const result = specToReactFlow(spec);
    const ids = result.nodes.map((n) => n.id);
    expect(ids.indexOf("g1")).toBeLessThan(ids.indexOf("s1"));
  });

  it("preserves edge-specific fields in data", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "s2", name: "worker", kind: "worker", position: { x: 300, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "s1", to: "s2", protocol: "queue" as const, topicName: "tasks" }],
    });
    const result = specToReactFlow(spec);
    expect(result.edges[0]!.data).toMatchObject({
      protocol: "queue",
      topicName: "tasks",
    });
  });
});
