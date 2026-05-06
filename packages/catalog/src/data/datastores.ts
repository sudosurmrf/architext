/**
 * @module @architext/catalog/data/datastores
 * Concepts: [[CatalogData]], [[Datastore]], [[ServiceCreatingToken]]
 * Spec: §7.2 v1 catalog scope — Datastores drop as Service: PostgreSQL, MySQL, MongoDB, Redis
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "postgres",
    category: "datastore",
    name: "PostgreSQL",
    description: "Relational SQL database",
    tags: ["database", "sql", "relational"],
    dropsAs: "service",
    serviceKindIfService: "database",
    files: [{ path: "schema.sql" }],
    defaultConfig: { port: 5432 },
  },
  {
    id: "mysql",
    category: "datastore",
    name: "MySQL",
    description: "Widely-used relational SQL database",
    tags: ["database", "sql", "relational"],
    dropsAs: "service",
    serviceKindIfService: "database",
    files: [{ path: "schema.sql" }],
    defaultConfig: { port: 3306 },
  },
  {
    id: "mongodb",
    category: "datastore",
    name: "MongoDB",
    description: "Document-oriented NoSQL database",
    tags: ["database", "nosql", "document"],
    dropsAs: "service",
    serviceKindIfService: "database",
    files: [{ path: "schema.json" }],
    defaultConfig: { port: 27017 },
  },
  {
    id: "redis",
    category: "datastore",
    name: "Redis",
    description: "In-memory key-value store",
    tags: ["cache", "kv"],
    dropsAs: "service",
    serviceKindIfService: "cache",
    defaultConfig: { port: 6379 },
  },
] as const;

export const datastores: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
