/**
 * @module @architext/patterns/data/frontend-backend-db
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — Frontend + Backend + DB
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const frontendBackendDb: Pattern = PatternSchema.parse({
  id: "frontend-backend-db",
  name: "Frontend + Backend + DB",
  description: "A SPA frontend, a REST backend, and a SQL database.",
  fragment: {
    groups: [{ name: "Backend", kind: "backend", tmpId: "g-be" }],
    services: [
      {
        name: "web",
        kind: "frontend-app",
        tmpId: "web",
        offset: { x: 0, y: 0 },
        components: [
          { id: "typescript", category: "language" },
          { id: "react", category: "library" },
          { id: "vite", category: "build-tool" },
        ],
      },
      {
        name: "api",
        kind: "backend-service",
        tmpId: "api",
        tmpGroupId: "g-be",
        offset: { x: 350, y: 0 },
        components: [
          { id: "node", category: "runtime" },
          { id: "express", category: "framework" },
        ],
      },
      {
        name: "db",
        kind: "database",
        tmpId: "db",
        tmpGroupId: "g-be",
        offset: { x: 600, y: 100 },
        components: [{ id: "postgres", category: "datastore" }],
      },
    ],
    edges: [
      { from: "web", to: "api", protocol: "http", basePath: "/api" },
      { from: "api", to: "db", protocol: "sql", port: 5432 },
    ],
  },
});
