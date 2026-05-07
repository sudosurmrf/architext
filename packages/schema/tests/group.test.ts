import { describe, it, expect } from "vitest";
import { GroupKindSchema, GroupSchema } from "../src/group";

describe("GroupKindSchema", () => {
  it("accepts each documented kind", () => {
    const kinds = ["frontend", "backend", "data", "workers", "external", "infrastructure", "sidecars", "custom"];
    for (const k of kinds) {
      expect(GroupKindSchema.safeParse(k).success).toBe(true);
    }
  });

  it("rejects unknown kinds", () => {
    expect(GroupKindSchema.safeParse("nope").success).toBe(false);
  });
});

describe("GroupSchema", () => {
  const valid = {
    id: "g1",
    name: "Backend",
    kind: "backend",
    serviceIds: ["s1", "s2"],
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
  };

  it("accepts the minimal valid group", () => {
    expect(GroupSchema.parse(valid)).toMatchObject(valid);
  });

  it("accepts optional network field", () => {
    const result = GroupSchema.parse({ ...valid, network: "private" });
    expect(result.network).toBe("private");
  });

  it("accepts optional description", () => {
    const result = GroupSchema.parse({ ...valid, description: "Private backend tier." });
    expect(result.description).toBe("Private backend tier.");
  });

  it("rejects unknown network values", () => {
    expect(GroupSchema.safeParse({ ...valid, network: "weird" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(GroupSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("allows empty serviceIds (a group can be created before services are added)", () => {
    expect(GroupSchema.safeParse({ ...valid, serviceIds: [] }).success).toBe(true);
  });

  it("rejects duplicate serviceIds", () => {
    expect(GroupSchema.safeParse({ ...valid, serviceIds: ["s1", "s1"] }).success).toBe(false);
  });
});
