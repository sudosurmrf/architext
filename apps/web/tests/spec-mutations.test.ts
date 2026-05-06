import { describe, it, expect } from "vitest";
import {
  addGroup,
  addService,
  addComponent,
  removeNode,
  addEdge,
  removeEdge,
  moveNode,
  resizeGroup,
  duplicateNode,
} from "../src/lib/spec-mutations";
import type { ArchitextSpec, Group, Service, Edge, Position, Size } from "@architext/schema";

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

const pos: Position = { x: 100, y: 200 };
const size: Size = { width: 400, height: 300 };

describe("addGroup", () => {
  it("appends a new group to the spec", () => {
    const spec = makeSpec();
    const result = addGroup(spec, { id: "g1", name: "Backend", kind: "backend", position: pos, size });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]!.id).toBe("g1");
    expect(result.groups[0]!.serviceIds).toEqual([]);
  });

  it("does not mutate the original spec", () => {
    const spec = makeSpec();
    addGroup(spec, { id: "g1", name: "Backend", kind: "backend", position: pos, size });
    expect(spec.groups).toHaveLength(0);
  });
});

describe("addService", () => {
  it("appends a top-level service", () => {
    const spec = makeSpec();
    const result = addService(spec, {
      id: "s1",
      name: "api",
      kind: "backend-service",
      position: pos,
      components: [],
    });
    expect(result.services).toHaveLength(1);
    expect(result.services[0]!.groupId).toBeUndefined();
  });

  it("appends a service inside a group and updates serviceIds", () => {
    const spec = makeSpec({
      groups: [{ id: "g1", name: "G1", kind: "backend", serviceIds: [], position: pos, size }],
    });
    const result = addService(spec, {
      id: "s1",
      name: "api",
      kind: "backend-service",
      position: pos,
      components: [],
      groupId: "g1",
    });
    expect(result.services[0]!.groupId).toBe("g1");
    expect(result.groups[0]!.serviceIds).toContain("s1");
  });

  it("does not mutate the original spec", () => {
    const spec = makeSpec();
    addService(spec, { id: "s1", name: "api", kind: "backend-service", position: pos, components: [] });
    expect(spec.services).toHaveLength(0);
  });
});

describe("addComponent", () => {
  it("adds a component to the target service", () => {
    const spec = makeSpec({
      services: [{ id: "s1", name: "web", kind: "frontend-app", position: pos, components: [] }],
    });
    const result = addComponent(spec, "s1", { id: "react", category: "library" });
    expect(result.services[0]!.components).toHaveLength(1);
    expect(result.services[0]!.components[0]!.id).toBe("react");
  });

  it("throws for unknown service", () => {
    const spec = makeSpec();
    expect(() => addComponent(spec, "missing", { id: "react", category: "library" })).toThrow();
  });

  it("does not mutate the original spec", () => {
    const spec = makeSpec({
      services: [{ id: "s1", name: "web", kind: "frontend-app", position: pos, components: [] }],
    });
    addComponent(spec, "s1", { id: "react", category: "library" });
    expect(spec.services[0]!.components).toHaveLength(0);
  });
});

describe("removeNode", () => {
  it("removes a service and its edges", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: pos, components: [] },
        { id: "s2", name: "db", kind: "database", position: pos, components: [] },
      ],
      edges: [{ id: "e1", from: "s1", to: "s2", protocol: "sql" as const }],
    });
    const result = removeNode(spec, "s1");
    expect(result.services).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });

  it("removes a group and unlinks its services (services become top-level)", () => {
    const spec = makeSpec({
      groups: [{ id: "g1", name: "G1", kind: "backend", serviceIds: ["s1"], position: pos, size }],
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: pos, components: [], groupId: "g1" },
      ],
    });
    const result = removeNode(spec, "g1");
    expect(result.groups).toHaveLength(0);
    expect(result.services[0]!.groupId).toBeUndefined();
  });

  it("does not mutate the original spec", () => {
    const spec = makeSpec({
      services: [{ id: "s1", name: "api", kind: "backend-service", position: pos, components: [] }],
    });
    removeNode(spec, "s1");
    expect(spec.services).toHaveLength(1);
  });
});

describe("addEdge", () => {
  it("adds a new edge", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: pos, components: [] },
        { id: "s2", name: "db", kind: "database", position: pos, components: [] },
      ],
    });
    const edge: Edge = { id: "e1", from: "s1", to: "s2", protocol: "sql" };
    const result = addEdge(spec, edge);
    expect(result.edges).toHaveLength(1);
  });

  it("rejects self-loops", () => {
    const spec = makeSpec({
      services: [{ id: "s1", name: "api", kind: "backend-service", position: pos, components: [] }],
    });
    expect(() => addEdge(spec, { id: "e1", from: "s1", to: "s1", protocol: "http" })).toThrow("self-loop");
  });

  it("rejects duplicate edges (same from/to/protocol)", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: pos, components: [] },
        { id: "s2", name: "db", kind: "database", position: pos, components: [] },
      ],
      edges: [{ id: "e1", from: "s1", to: "s2", protocol: "sql" as const }],
    });
    expect(() => addEdge(spec, { id: "e2", from: "s1", to: "s2", protocol: "sql" })).toThrow("duplicate");
  });

  it("does not mutate the original spec", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: pos, components: [] },
        { id: "s2", name: "db", kind: "database", position: pos, components: [] },
      ],
    });
    addEdge(spec, { id: "e1", from: "s1", to: "s2", protocol: "sql" });
    expect(spec.edges).toHaveLength(0);
  });
});

describe("removeEdge", () => {
  it("removes an edge by id", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: pos, components: [] },
        { id: "s2", name: "db", kind: "database", position: pos, components: [] },
      ],
      edges: [{ id: "e1", from: "s1", to: "s2", protocol: "sql" as const }],
    });
    const result = removeEdge(spec, "e1");
    expect(result.edges).toHaveLength(0);
  });
});

describe("moveNode", () => {
  it("updates a service position", () => {
    const spec = makeSpec({
      services: [{ id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] }],
    });
    const result = moveNode(spec, "s1", { x: 50, y: 75 });
    expect(result.services[0]!.position).toEqual({ x: 50, y: 75 });
  });

  it("updates a group position", () => {
    const spec = makeSpec({
      groups: [{ id: "g1", name: "G1", kind: "backend", serviceIds: [], position: { x: 0, y: 0 }, size }],
    });
    const result = moveNode(spec, "g1", { x: 30, y: 40 });
    expect(result.groups[0]!.position).toEqual({ x: 30, y: 40 });
  });

  it("does not mutate the original spec", () => {
    const spec = makeSpec({
      services: [{ id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] }],
    });
    moveNode(spec, "s1", { x: 50, y: 75 });
    expect(spec.services[0]!.position).toEqual({ x: 0, y: 0 });
  });
});

describe("resizeGroup", () => {
  it("updates a group size", () => {
    const spec = makeSpec({
      groups: [{ id: "g1", name: "G1", kind: "backend", serviceIds: [], position: pos, size: { width: 100, height: 100 } }],
    });
    const result = resizeGroup(spec, "g1", { width: 500, height: 400 });
    expect(result.groups[0]!.size).toEqual({ width: 500, height: 400 });
  });

  it("throws for non-existent group", () => {
    const spec = makeSpec();
    expect(() => resizeGroup(spec, "missing", { width: 100, height: 100 })).toThrow();
  });
});

describe("duplicateNode", () => {
  it("duplicates a service with new id and offset position", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 100, y: 100 }, components: [{ id: "typescript", category: "language" }] },
      ],
    });
    const result = duplicateNode(spec, "s1", "s1-copy");
    expect(result.services).toHaveLength(2);
    expect(result.services[1]!.id).toBe("s1-copy");
    expect(result.services[1]!.name).toBe("api (copy)");
    expect(result.services[1]!.position.x).toBeGreaterThan(100);
    expect(result.services[1]!.components).toEqual(spec.services[0]!.components);
  });

  it("duplicates a group with new id", () => {
    const spec = makeSpec({
      groups: [{ id: "g1", name: "G1", kind: "backend", serviceIds: [], position: { x: 0, y: 0 }, size }],
    });
    const result = duplicateNode(spec, "g1", "g1-copy");
    expect(result.groups).toHaveLength(2);
    expect(result.groups[1]!.id).toBe("g1-copy");
    expect(result.groups[1]!.name).toBe("G1 (copy)");
  });
});
