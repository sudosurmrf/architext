/**
 * @module @architext/catalog/data/runtimes
 * Concepts: [[CatalogData]], [[Runtime]]
 * Spec: §7.2 v1 catalog scope — Runtimes: Node, Bun
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]] (aggregator)
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "node",
    category: "runtime",
    name: "Node.js",
    description: "JavaScript runtime built on V8",
    tags: ["runtime", "javascript"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service", "worker"],
    files: [{ path: "package.json" }, { path: ".nvmrc" }],
  },
  {
    id: "bun",
    category: "runtime",
    name: "Bun",
    description: "Fast all-in-one JavaScript runtime",
    tags: ["runtime", "javascript", "fast"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service", "worker"],
    files: [{ path: "package.json" }, { path: "bunfig.toml" }],
  },
] as const;

export const runtimes: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
