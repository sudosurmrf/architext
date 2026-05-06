import { describe, it, expect } from "vitest";
import { canDrop, type DropResult } from "../src/lib/can-drop";
import type { DragItem, DropTarget } from "../src/types/drag";
import type { ArchitextSpec } from "@architext/schema";

/** Minimal valid spec for testing */
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

const canvas: DropTarget = { zone: "canvas" };
const inGroup: DropTarget = { zone: "group", groupId: "g1" };
const inService: DropTarget = { zone: "service", serviceId: "s1" };

describe("canDrop — group-token", () => {
  const groupItem: DragItem = { type: "group-token", groupKind: "backend", name: "Backend" };

  it("allows group token on empty canvas", () => {
    const result = canDrop(groupItem, canvas, makeSpec());
    expect(result.allowed).toBe(true);
  });

  it("allows group token inside existing group (nesting)", () => {
    const spec = makeSpec({
      groups: [
        { id: "g1", name: "G1", kind: "backend", serviceIds: [], position: { x: 0, y: 0 }, size: { width: 400, height: 300 } },
      ],
    });
    const result = canDrop(groupItem, inGroup, spec);
    expect(result.allowed).toBe(true);
  });

  it("rejects group token inside a service", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
      ],
    });
    const result = canDrop(groupItem, inService, spec);
    expect(result.allowed).toBe(false);
  });
});

describe("canDrop — service-token", () => {
  const serviceItem: DragItem = { type: "service-token", serviceKind: "backend-service", name: "API" };

  it("allows service token on empty canvas (top-level service)", () => {
    const result = canDrop(serviceItem, canvas, makeSpec());
    expect(result.allowed).toBe(true);
  });

  it("allows service token inside a group", () => {
    const spec = makeSpec({
      groups: [
        { id: "g1", name: "G1", kind: "backend", serviceIds: [], position: { x: 0, y: 0 }, size: { width: 400, height: 300 } },
      ],
    });
    const result = canDrop(serviceItem, inGroup, spec);
    expect(result.allowed).toBe(true);
  });

  it("rejects service token inside a service", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
      ],
    });
    const result = canDrop(serviceItem, inService, spec);
    expect(result.allowed).toBe(false);
  });
});

describe("canDrop — component-chip", () => {
  const reactChip: DragItem = { type: "component-chip", catalogId: "react", category: "library", name: "React" };

  it("allows component chip inside a compatible service", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "web", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
      ],
    });
    const result = canDrop(reactChip, inService, spec);
    expect(result.allowed).toBe(true);
  });

  it("rejects component chip inside an incompatible service", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "db", kind: "database", position: { x: 0, y: 0 }, components: [] },
      ],
    });
    const result = canDrop(reactChip, inService, spec);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("compatible");
  });

  it("rejects component chip inside a group (not a service)", () => {
    const spec = makeSpec({
      groups: [
        { id: "g1", name: "G1", kind: "backend", serviceIds: [], position: { x: 0, y: 0 }, size: { width: 400, height: 300 } },
      ],
    });
    const result = canDrop(reactChip, inGroup, spec);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Service");
  });

  it("rejects component chip on empty canvas", () => {
    const result = canDrop(reactChip, canvas, makeSpec());
    expect(result.allowed).toBe(false);
  });

  it("rejects duplicate component in same service", () => {
    const spec = makeSpec({
      services: [
        {
          id: "s1",
          name: "web",
          kind: "frontend-app",
          position: { x: 0, y: 0 },
          components: [{ id: "react", category: "library" }],
        },
      ],
    });
    const result = canDrop(reactChip, inService, spec);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("already");
  });

  it("allows datastore component inside database service", () => {
    const pgComponent: DragItem = { type: "component-chip", catalogId: "postgres-driver", category: "datastore", name: "PG" };
    const spec = makeSpec({
      services: [
        { id: "s1", name: "db", kind: "database", position: { x: 0, y: 0 }, components: [] },
      ],
    });
    const result = canDrop(pgComponent, inService, spec);
    expect(result.allowed).toBe(true);
  });
});

describe("canDrop — pattern", () => {
  const pattern: DragItem = { type: "pattern", patternId: "rest-api-with-db", name: "REST API + DB" };

  it("allows pattern on empty canvas", () => {
    const result = canDrop(pattern, canvas, makeSpec());
    expect(result.allowed).toBe(true);
  });

  it("rejects pattern inside a group", () => {
    const spec = makeSpec({
      groups: [
        { id: "g1", name: "G1", kind: "backend", serviceIds: [], position: { x: 0, y: 0 }, size: { width: 400, height: 300 } },
      ],
    });
    const result = canDrop(pattern, inGroup, spec);
    expect(result.allowed).toBe(false);
  });

  it("rejects pattern inside a service", () => {
    const spec = makeSpec({
      services: [
        { id: "s1", name: "api", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
      ],
    });
    const result = canDrop(pattern, inService, spec);
    expect(result.allowed).toBe(false);
  });
});
