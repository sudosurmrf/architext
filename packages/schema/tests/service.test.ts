import { describe, it, expect } from "vitest";
import { ServiceKindSchema, ServiceSchema } from "../src/service";

describe("ServiceKindSchema", () => {
  it("accepts each documented kind", () => {
    const kinds = [
      "frontend-app",
      "backend-service",
      "worker",
      "database",
      "cache",
      "queue",
      "infrastructure",
      "sidecar",
      "external-api",
    ];
    for (const k of kinds) {
      expect(ServiceKindSchema.safeParse(k).success).toBe(true);
    }
  });

  it("rejects unknown kinds", () => {
    expect(ServiceKindSchema.safeParse("nope").success).toBe(false);
  });
});

describe("ServiceSchema", () => {
  const valid = {
    id: "s1",
    name: "api",
    kind: "backend-service",
    position: { x: 0, y: 0 },
    components: [{ id: "fastapi", category: "framework" }],
  };

  it("accepts the minimal valid service", () => {
    expect(ServiceSchema.parse(valid)).toMatchObject(valid);
  });

  it("accepts optional groupId", () => {
    expect(ServiceSchema.parse({ ...valid, groupId: "g1" }).groupId).toBe("g1");
  });

  it("accepts optional description and service contracts", () => {
    const result = ServiceSchema.parse({
      ...valid,
      description: "Public API for the app.",
      contracts: [
        {
          id: "edge1-outbound",
          name: "Create task request",
          edgeId: "edge1",
          direction: "outbound",
          contentType: "application/json",
          schema: '{ "title": "string" }',
        },
      ],
    });
    expect(result.description).toBe("Public API for the app.");
    expect(result.contracts?.[0]?.schema).toContain("title");
  });

  it("rejects empty name", () => {
    expect(ServiceSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("allows empty components", () => {
    expect(ServiceSchema.safeParse({ ...valid, components: [] }).success).toBe(true);
  });

  it("rejects components with duplicate ids", () => {
    expect(
      ServiceSchema.safeParse({
        ...valid,
        components: [
          { id: "react", category: "library" },
          { id: "react", category: "library" },
        ],
      }).success
    ).toBe(false);
  });

  it("rejects contracts with duplicate ids", () => {
    expect(
      ServiceSchema.safeParse({
        ...valid,
        contracts: [
          { id: "c1", name: "A", direction: "outbound" },
          { id: "c1", name: "B", direction: "inbound" },
        ],
      }).success
    ).toBe(false);
  });
});
