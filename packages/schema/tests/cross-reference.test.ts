import { describe, it, expect } from "vitest";
import { ArchitextSpecSchema } from "../src/spec";
import { SCHEMA_VERSION } from "../src/version";

const baseGroup = {
  id: "g1",
  name: "Backend",
  kind: "backend" as const,
  position: { x: 0, y: 0 },
  size: { width: 400, height: 300 },
};

const baseService = {
  id: "api",
  name: "api",
  kind: "backend-service" as const,
  position: { x: 0, y: 0 },
  components: [],
};

const ok = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "X", slug: "x" },
  groups: [],
  services: [],
  edges: [],
};

describe("Cross-reference validation", () => {
  it("rejects duplicate service ids across the spec", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services: [
        { ...baseService, id: "api" },
        { ...baseService, id: "api", name: "duplicate" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate group ids across the spec", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      groups: [
        { ...baseGroup, serviceIds: [] },
        { ...baseGroup, serviceIds: [] },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate edge ids", () => {
    const services = [
      { ...baseService, id: "a" },
      { ...baseService, id: "b" },
    ];
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services,
      edges: [
        { id: "e1", from: "a", to: "b", protocol: "http" },
        { id: "e1", from: "a", to: "b", protocol: "http" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects group.serviceIds that don't reference a real service", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      groups: [{ ...baseGroup, serviceIds: ["ghost"] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects service.groupId that doesn't reference a real group", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services: [{ ...baseService, groupId: "ghost" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects edge.from / edge.to that don't reference a real service", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services: [{ ...baseService, id: "api" }],
      edges: [{ id: "e1", from: "api", to: "ghost", protocol: "http" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects edge self-loops (from === to)", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services: [{ ...baseService, id: "api" }],
      edges: [{ id: "e1", from: "api", to: "api", protocol: "http" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fully consistent spec", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      groups: [{ ...baseGroup, serviceIds: ["api", "db"] }],
      services: [
        { ...baseService, id: "api", groupId: "g1" },
        { ...baseService, id: "db", kind: "database", groupId: "g1" },
      ],
      edges: [{ id: "e1", from: "api", to: "db", protocol: "sql" }],
    });
    expect(result.success).toBe(true);
  });
});
