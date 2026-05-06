/**
 * @module @architext/catalog/data/languages
 * Concepts: [[CatalogData]], [[Language]]
 * Spec: §7.2 v1 catalog scope — Languages: TypeScript, Python, Go
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]] (aggregator)
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "typescript",
    category: "language",
    name: "TypeScript",
    description: "Typed superset of JavaScript",
    tags: ["language", "typed", "javascript"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service", "worker"],
    files: [{ path: "tsconfig.json" }],
  },
  {
    id: "python",
    category: "language",
    name: "Python",
    description: "High-level interpreted language",
    tags: ["language", "interpreted"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service", "worker"],
    files: [{ path: "pyproject.toml" }, { path: ".python-version" }],
  },
  {
    id: "go",
    category: "language",
    name: "Go",
    description: "Compiled, statically typed language from Google",
    tags: ["language", "compiled", "static"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service", "worker"],
    files: [{ path: "go.mod" }, { path: "go.sum" }],
  },
] as const;

export const languages: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
