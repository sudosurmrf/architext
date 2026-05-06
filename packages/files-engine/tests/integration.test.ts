import { describe, it, expect } from "vitest";
import { computeFileTree, applyWhen, alwaysFiles, type FileTree } from "../src";
import { loadCatalog } from "@architext/catalog";
import { loadPatterns, instantiatePattern } from "@architext/patterns";
import { ArchitextSpecSchema, SCHEMA_VERSION } from "@architext/schema";

describe("Plan 2 cross-package integration", () => {
  it("re-exports the public surface", () => {
    expect(typeof computeFileTree).toBe("function");
    expect(typeof applyWhen).toBe("function");
    expect(typeof alwaysFiles).toBe("function");
  });

  it("instantiates a pattern, validates as ArchitextSpec, and computes a non-empty file tree", () => {
    const catalog = loadCatalog();
    const patterns = loadPatterns();
    const pattern = patterns.byId("frontend-backend-db")!;

    let n = 0;
    const fragment = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);
    const spec = ArchitextSpecSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Smoke", slug: "smoke" },
      groups: fragment.groups,
      services: fragment.services,
      edges: fragment.edges,
    });

    const tree: FileTree = computeFileTree(spec, catalog);
    expect(tree.paths.length).toBeGreaterThan(3); // at minimum, the always-files + something per service
    expect(tree.paths).toContain(".gitignore");
    expect(tree.paths).toContain("README.md");
    expect(tree.paths).toContain("architext-spec.json");
    // Every service in the spec should have a byService entry (even if empty)
    for (const s of spec.services) {
      expect(tree.byService[s.id]).toBeDefined();
    }
  });
});
