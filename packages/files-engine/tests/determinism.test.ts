import { describe, it, expect } from "vitest";
import { computeFileTree } from "../src/compute";
import { loadCatalog } from "@architext/catalog";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";

const spec: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Det", slug: "det" },
  groups: [],
  services: [
    {
      id: "web",
      name: "web",
      kind: "frontend-app",
      position: { x: 0, y: 0 },
      components: [
        { id: "typescript", category: "language" },
        { id: "react", category: "library" },
        { id: "vite", category: "build-tool" },
      ],
    },
    {
      id: "api",
      name: "api",
      kind: "backend-service",
      position: { x: 0, y: 0 },
      components: [
        { id: "python", category: "language" },
        { id: "fastapi", category: "framework" },
      ],
    },
  ],
  edges: [],
};

describe("computeFileTree determinism", () => {
  const catalog = loadCatalog();

  it("produces identical output across invocations", () => {
    const a = computeFileTree(spec, catalog);
    const b = computeFileTree(spec, catalog);
    expect(b).toEqual(a);
  });

  it("produces identical paths for identical input regardless of service order", () => {
    const reordered: ArchitextSpec = {
      ...spec,
      services: [...spec.services].reverse(),
    };
    const a = computeFileTree(spec, loadCatalog());
    const b = computeFileTree(reordered, loadCatalog());
    expect(b.paths).toEqual(a.paths);
  });
});
