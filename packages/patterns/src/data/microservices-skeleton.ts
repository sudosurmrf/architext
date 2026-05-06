/**
 * @module @architext/patterns/data/microservices-skeleton
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — Microservices skeleton
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const microservicesSkeleton: Pattern = PatternSchema.parse({
  id: "microservices-skeleton",
  name: "Microservices skeleton",
  description: "Three backend services in a group, sharing a single database.",
  fragment: {
    groups: [{ name: "Services", kind: "backend", tmpId: "g-svc" }],
    services: [
      {
        name: "users",
        kind: "backend-service",
        tmpId: "users",
        tmpGroupId: "g-svc",
        offset: { x: 0, y: 0 },
        components: [{ id: "node", category: "runtime" }, { id: "express", category: "framework" }],
      },
      {
        name: "orders",
        kind: "backend-service",
        tmpId: "orders",
        tmpGroupId: "g-svc",
        offset: { x: 250, y: 0 },
        components: [{ id: "node", category: "runtime" }, { id: "express", category: "framework" }],
      },
      {
        name: "billing",
        kind: "backend-service",
        tmpId: "billing",
        tmpGroupId: "g-svc",
        offset: { x: 500, y: 0 },
        components: [{ id: "node", category: "runtime" }, { id: "express", category: "framework" }],
      },
      {
        name: "db",
        kind: "database",
        tmpId: "db",
        offset: { x: 250, y: 200 },
        components: [{ id: "postgres", category: "datastore" }],
      },
    ],
    edges: [
      { from: "users", to: "db", protocol: "sql" },
      { from: "orders", to: "db", protocol: "sql" },
      { from: "billing", to: "db", protocol: "sql" },
    ],
  },
});
