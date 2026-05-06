import { describe, it, expect } from "vitest";
import { ArchitextSpecSchema } from "../src/spec";
import { SCHEMA_VERSION } from "../src/version";

const minimal = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "X", slug: "x" },
  groups: [],
  services: [],
  edges: [],
};

describe("ArchitextSpecSchema (shape-only)", () => {
  it("accepts the empty-but-valid spec", () => {
    expect(ArchitextSpecSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects missing schemaVersion", () => {
    const bad = { ...minimal } as Record<string, unknown>;
    delete bad.schemaVersion;
    expect(ArchitextSpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    expect(
      ArchitextSpecSchema.safeParse({ ...minimal, schemaVersion: "0.2.0" }).success
    ).toBe(false);
  });

  it("rejects missing top-level arrays", () => {
    const bad = { ...minimal } as Record<string, unknown>;
    delete bad.services;
    expect(ArchitextSpecSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a populated spec (no cross-refs yet — those come later)", () => {
    const populated = {
      ...minimal,
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          position: { x: 0, y: 0 },
          components: [{ id: "fastapi", category: "framework" }],
        },
      ],
    };
    expect(ArchitextSpecSchema.safeParse(populated).success).toBe(true);
  });
});
