import { describe, it, expect } from "vitest";
import { PatternSchema, SpecFragmentSchema } from "../src/types";

describe("SpecFragmentSchema", () => {
  it("accepts a fragment with services and edges (no groups)", () => {
    const fragment = {
      services: [{ name: "api", kind: "backend-service" }],
      edges: [],
    };
    expect(SpecFragmentSchema.safeParse(fragment).success).toBe(true);
  });

  it("accepts a fragment with all three arrays", () => {
    const fragment = {
      groups: [{ name: "Backend", kind: "backend" }],
      services: [{ name: "api", kind: "backend-service" }],
      edges: [{ from: "tmp-api", to: "tmp-db", protocol: "sql" }],
    };
    expect(SpecFragmentSchema.safeParse(fragment).success).toBe(true);
  });

  it("requires services and edges (groups optional)", () => {
    expect(SpecFragmentSchema.safeParse({ edges: [] }).success).toBe(false);
    expect(SpecFragmentSchema.safeParse({ services: [] }).success).toBe(false);
  });
});

describe("PatternSchema", () => {
  const minimal = {
    id: "rest-api-with-db",
    name: "REST API + DB",
    description: "A backend service connected to a database via SQL",
    fragment: {
      services: [{ name: "api", kind: "backend-service" }],
      edges: [],
    },
  };

  it("accepts the minimal pattern", () => {
    expect(PatternSchema.safeParse(minimal).success).toBe(true);
  });

  it("accepts iconUrl and preview", () => {
    expect(
      PatternSchema.safeParse({
        ...minimal,
        iconUrl: "https://example.com/icon.svg",
        preview: "<svg>...</svg>",
      }).success
    ).toBe(true);
  });

  it("rejects empty id, name, description", () => {
    expect(PatternSchema.safeParse({ ...minimal, id: "" }).success).toBe(false);
    expect(PatternSchema.safeParse({ ...minimal, name: "" }).success).toBe(false);
    expect(PatternSchema.safeParse({ ...minimal, description: "" }).success).toBe(false);
  });
});
