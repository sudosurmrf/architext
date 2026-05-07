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

  it("stores group-relative positions for grouped services, absolute for ungrouped", () => {
    let n = 0;
    const result = instantiatePattern(pattern, { x: 100, y: 100 }, () => `id-${++n}`);
    const api = result.services.find((s) => s.name === "api")!;
    const db = result.services.find((s) => s.name === "db")!;
    // api is inside group g1 → position is relative to the group (just the offset)
    expect(api.position).toEqual({ x: 0, y: 0 });
    // db is also inside group g1 → relative position is the offset {200, 50}
    expect(db.position).toEqual({ x: 200, y: 50 });
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

  it("preserves cloud protocol-specific fields", () => {
    const cloudPattern: Pattern = {
      id: "cloud",
      name: "cloud",
      description: "cloud",
      fragment: {
        services: [
          { name: "api", kind: "backend-service", tmpId: "api" },
          { name: "infra", kind: "infrastructure", tmpId: "infra" },
        ],
        edges: [
          { from: "api", to: "infra", protocol: "event", eventBus: "app", source: "api", detailType: "created" },
          { from: "api", to: "infra", protocol: "object-storage", bucket: "assets", prefix: "uploads/" },
          { from: "api", to: "infra", protocol: "identity", provider: "cognito", scopes: ["openid"] },
          { from: "api", to: "infra", protocol: "secret", namespace: "app" },
          { from: "api", to: "infra", protocol: "container-image", repository: "api", tag: "latest" },
          { from: "api", to: "infra", protocol: "lambda-invoke", functionName: "handler", invocationType: "request-response", endpointVisibility: "private", authorizer: "iam" },
          { from: "api", to: "infra", protocol: "dns", domainName: "app.example.com", recordType: "A" },
        ],
      },
    };
    let n = 0;
    const result = instantiatePattern(cloudPattern, { x: 0, y: 0 }, () => `id-${++n}`);

    expect(result.edges).toHaveLength(7);
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ protocol: "event", eventBus: "app", source: "api", detailType: "created" }),
        expect.objectContaining({ protocol: "object-storage", bucket: "assets", prefix: "uploads/" }),
        expect.objectContaining({ protocol: "identity", provider: "cognito", scopes: ["openid"] }),
        expect.objectContaining({ protocol: "secret", namespace: "app" }),
        expect.objectContaining({ protocol: "container-image", repository: "api", tag: "latest" }),
        expect.objectContaining({ protocol: "lambda-invoke", functionName: "handler", invocationType: "request-response", endpointVisibility: "private", authorizer: "iam" }),
        expect.objectContaining({ protocol: "dns", domainName: "app.example.com", recordType: "A" }),
      ]),
    );
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
