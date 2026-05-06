/**
 * @module @architext/catalog/data/queues
 * Concepts: [[CatalogData]], [[Queue]], [[ServiceCreatingToken]]
 * Spec: §7.2 v1 catalog scope — Queues drop as Service: RabbitMQ, Redis Streams
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "rabbitmq",
    category: "datastore",
    name: "RabbitMQ",
    description: "AMQP message broker",
    tags: ["queue", "broker", "amqp"],
    dropsAs: "service",
    serviceKindIfService: "queue",
    defaultConfig: { port: 5672 },
  },
  {
    id: "redis-streams",
    category: "datastore",
    name: "Redis Streams",
    description: "Durable log/queue using Redis",
    tags: ["queue", "broker", "redis"],
    dropsAs: "service",
    serviceKindIfService: "queue",
    defaultConfig: { port: 6379 },
  },
] as const;

export const queues: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
