/**
 * @module @architext/catalog/data/build-tools
 * Concepts: [[CatalogData]], [[BuildTool]]
 * Spec: §7.2 v1 catalog scope — Build tools: Vite
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "vite",
    category: "build-tool",
    name: "Vite",
    description: "Next-generation frontend tooling",
    tags: ["build-tool", "frontend", "fast"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [{ path: "vite.config.ts", when: { requires: ["typescript"] } }, { path: "vite.config.js", when: { excludes: ["typescript"] } }],
    defaultVersion: "^5.0.0",
  },
] as const;

export const buildTools: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
