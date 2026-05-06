import { describe, it, expect } from "vitest";
import { loadCatalog } from "../src/load";

describe("loadCatalog", () => {
  it("returns a Catalog with at least 22 entries (v1 scope)", () => {
    const cat = loadCatalog();
    expect(cat.entries.length).toBeGreaterThanOrEqual(22);
  });

  it("returns the same instance across calls (memoized)", () => {
    expect(loadCatalog()).toBe(loadCatalog());
  });

  it("has react in the library category", () => {
    const cat = loadCatalog();
    expect(cat.byId("react")?.category).toBe("library");
  });

  it("has postgres droppable as a database service", () => {
    const cat = loadCatalog();
    expect(cat.byKindIfService("database").map((e) => e.id)).toContain("postgres");
  });
});
