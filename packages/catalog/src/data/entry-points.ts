/**
 * @module @architext/catalog/data/entry-points
 * Concepts: [[CatalogData]], [[EntryPoint]]
 * Spec: §7.2 v1 catalog scope — Entry points: HTTP route, Scheduled job, Queue consumer, main()
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "entry-http-route",
    category: "entry-point",
    name: "HTTP route",
    description: "User-defined HTTP request handler",
    tags: ["entry-point", "http"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service"],
  },
  {
    id: "entry-scheduled-job",
    category: "entry-point",
    name: "Scheduled job",
    description: "User-defined recurring job",
    tags: ["entry-point", "cron", "scheduled"],
    dropsAs: "component",
    compatibleServiceKinds: ["worker", "backend-service"],
  },
  {
    id: "entry-queue-consumer",
    category: "entry-point",
    name: "Queue consumer",
    description: "User-defined message handler",
    tags: ["entry-point", "queue"],
    dropsAs: "component",
    compatibleServiceKinds: ["worker"],
  },
  {
    id: "entry-main",
    category: "entry-point",
    name: "main()",
    description: "User-defined start function",
    tags: ["entry-point", "main"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service", "worker"],
  },
] as const;

export const entryPoints: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
