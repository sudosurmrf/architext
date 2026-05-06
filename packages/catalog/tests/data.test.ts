import { describe, it, expect } from "vitest";
import { loadCatalog } from "../src/load";

describe("Catalog invariants (v1 data)", () => {
  const cat = loadCatalog();

  it("has unique ids across every entry", () => {
    const ids = cat.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a non-empty description and at least one tag", () => {
    for (const e of cat.entries) {
      expect(e.description.length).toBeGreaterThan(0);
      expect(e.tags.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("file rules' `requires`/`excludes` reference real catalog ids", () => {
    const ids = new Set(cat.entries.map((e) => e.id));
    for (const e of cat.entries) {
      for (const f of e.files ?? []) {
        for (const req of f.when?.requires ?? []) {
          expect(ids).toContain(req);
        }
        for (const exc of f.when?.excludes ?? []) {
          expect(ids).toContain(exc);
        }
      }
    }
  });

  it("covers every documented v1 category", () => {
    const cats = new Set(cat.entries.map((e) => e.category));
    for (const c of [
      "language",
      "runtime",
      "framework",
      "library",
      "build-tool",
      "datastore",
      "auth",
      "entry-point",
    ]) {
      expect(cats).toContain(c);
    }
  });

  it("has at least one drop-as-service entry per kind: database, cache, queue", () => {
    expect(cat.byKindIfService("database").length).toBeGreaterThanOrEqual(1);
    expect(cat.byKindIfService("cache").length).toBeGreaterThanOrEqual(1);
    expect(cat.byKindIfService("queue").length).toBeGreaterThanOrEqual(1);
  });
});
