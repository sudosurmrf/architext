import { describe, it, expect } from "vitest";
import { instantiatePattern } from "../src/instantiate";
import type { Pattern } from "../src/types";

const pattern: Pattern = {
  id: "rest-api-with-db",
  name: "REST API + DB",
  description: "A backend service connected to a database via SQL",
  fragment: {
    groups: [{ name: "Backend", kind: "backend", tmpId: "g1" }],
    services: [
      { name: "api", kind: "backend-service", tmpId: "api", tmpGroupId: "g1", offset: { x: 0, y: 0 } },
      { name: "db", kind: "database", tmpId: "db", tmpGroupId: "g1", offset: { x: 200, y: 50 } },
    ],
    edges: [{ from: "api", to: "db", protocol: "sql" }],
  },
};

describe("instantiatePattern", () => {
  it("returns groups, services, and edges with fresh ids", () => {
    let n = 0;
    const idGen = () => `id-${++n}`;
    const result = instantiatePattern(pattern, { x: 100, y: 100 }, idGen);

    expect(result.groups).toHaveLength(1);
    expect(result.services).toHaveLength(2);
    expect(result.edges).toHaveLength(1);

    // ids are the deterministic ones from idGen
    const ids = [
      ...result.groups.map((g) => g.id),
      ...result.services.map((s) => s.id),
      ...result.edges.map((e) => e.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^id-\d+$/);
    }
  });

  it("offsets service positions by drop point", () => {
    let n = 0;
    const result = instantiatePattern(pattern, { x: 100, y: 100 }, () => `id-${++n}`);
    const api = result.services.find((s) => s.name === "api")!;
    const db = result.services.find((s) => s.name === "db")!;
    expect(api.position).toEqual({ x: 100, y: 100 });
    expect(db.position).toEqual({ x: 300, y: 150 });
  });

  it("re-points service.groupId to the new group id", () => {
    let n = 0;
    const result = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);
    const groupId = result.groups[0]!.id;
    for (const s of result.services) {
      expect(s.groupId).toBe(groupId);
    }
  });

  it("re-points edge.from / edge.to to the new service ids", () => {
    let n = 0;
    const result = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);
    const apiId = result.services.find((s) => s.name === "api")!.id;
    const dbId = result.services.find((s) => s.name === "db")!.id;
    const edge = result.edges[0]!;
    expect(edge.from).toBe(apiId);
    expect(edge.to).toBe(dbId);
  });

  it("preserves edge protocol-specific fields", () => {
    const queuePattern: Pattern = {
      id: "p",
      name: "p",
      description: "p",
      fragment: {
        services: [
          { name: "p", kind: "backend-service", tmpId: "p" },
          { name: "q", kind: "queue", tmpId: "q" },
        ],
        edges: [{ from: "p", to: "q", protocol: "queue", topicName: "events" }],
      },
    };
    let n = 0;
    const result = instantiatePattern(queuePattern, { x: 0, y: 0 }, () => `id-${++n}`);
    const e = result.edges[0]!;
    expect(e.protocol).toBe("queue");
    if (e.protocol === "queue") {
      expect(e.topicName).toBe("events");
    }
  });

  it("throws when an edge tmpId reference doesn't match a service", () => {
    const broken: Pattern = {
      id: "p",
      name: "p",
      description: "p",
      fragment: {
        services: [{ name: "a", kind: "backend-service", tmpId: "a" }],
        edges: [{ from: "a", to: "ghost", protocol: "http" }],
      },
    };
    expect(() => instantiatePattern(broken, { x: 0, y: 0 }, () => "x")).toThrow(
      /unknown tmpId: ghost/
    );
  });
});
