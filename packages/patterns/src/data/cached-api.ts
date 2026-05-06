/**
 * @module @architext/patterns/data/cached-api
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — Cached API
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const cachedApi: Pattern = PatternSchema.parse({
  id: "cached-api",
  name: "Cached API",
  description: "A backend service backed by a database, fronted by a Redis cache.",
  fragment: {
    services: [
      {
        name: "api",
        kind: "backend-service",
        tmpId: "api",
        offset: { x: 200, y: 0 },
        components: [
          { id: "node", category: "runtime" },
          { id: "express", category: "framework" },
        ],
      },
      {
        name: "cache",
        kind: "cache",
        tmpId: "cache",
        offset: { x: 0, y: 100 },
        components: [{ id: "redis", category: "datastore" }],
      },
      {
        name: "db",
        kind: "database",
        tmpId: "db",
        offset: { x: 400, y: 100 },
        components: [{ id: "postgres", category: "datastore" }],
      },
    ],
    edges: [
      { from: "api", to: "cache", protocol: "key-value" },
      { from: "api", to: "db", protocol: "sql", port: 5432 },
    ],
  },
});
