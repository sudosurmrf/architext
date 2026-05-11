import { describe, it, expect } from "vitest";
import { ComponentCategorySchema, ComponentSchema } from "../src/component";

describe("ComponentCategorySchema", () => {
  it("accepts each documented category", () => {
    const categories = [
      "language",
      "runtime",
      "framework",
      "library",
      "build-tool",
      "datastore",
      "infrastructure",
      "ai",
      "workflow",
      "auth",
      "entry-point",
    ];
    for (const c of categories) {
      expect(ComponentCategorySchema.safeParse(c).success).toBe(true);
    }
  });

  it("rejects unknown categories", () => {
    expect(ComponentCategorySchema.safeParse("plugin").success).toBe(false);
  });
});

describe("ComponentSchema", () => {
  const minimal = { id: "react", category: "library" };

  it("accepts the minimal valid component", () => {
    expect(ComponentSchema.parse(minimal)).toMatchObject(minimal);
  });

  it("accepts optional version and config", () => {
    const result = ComponentSchema.parse({
      ...minimal,
      version: "^18.3.0",
      config: { strictMode: true },
      businessContext: { purpose: "Render task list UI.", acceptanceCriteria: ["shows empty state"] },
    });
    expect(result.version).toBe("^18.3.0");
    expect(result.config).toEqual({ strictMode: true });
    expect(result.businessContext?.purpose).toBe("Render task list UI.");
  });

  it("rejects empty id", () => {
    expect(ComponentSchema.safeParse({ id: "", category: "library" }).success).toBe(false);
  });

  it("rejects unknown category", () => {
    expect(ComponentSchema.safeParse({ id: "x", category: "weird" }).success).toBe(false);
  });
});
