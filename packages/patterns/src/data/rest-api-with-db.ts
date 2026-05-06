/**
 * @module @architext/patterns/data/rest-api-with-db
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — REST API + DB
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const restApiWithDb: Pattern = PatternSchema.parse({
  id: "rest-api-with-db",
  name: "REST API + DB",
  description: "A backend service exposing HTTP, connected to a SQL database.",
  fragment: {
    services: [
      {
        name: "api",
        kind: "backend-service",
        tmpId: "api",
        offset: { x: 0, y: 0 },
        components: [
          { id: "node", category: "runtime" },
          { id: "express", category: "framework" },
        ],
      },
      {
        name: "db",
        kind: "database",
        tmpId: "db",
        offset: { x: 250, y: 50 },
        components: [{ id: "postgres", category: "datastore" }],
      },
    ],
    edges: [
      { from: "api", to: "db", protocol: "sql", port: 5432 },
    ],
  },
});
