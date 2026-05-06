/**
 * @module @architext/patterns/data/worker-queue
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — Worker + Queue
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const workerQueue: Pattern = PatternSchema.parse({
  id: "worker-queue",
  name: "Worker + Queue",
  description: "A producer service, a queue, and a worker consuming messages.",
  fragment: {
    services: [
      {
        name: "producer",
        kind: "backend-service",
        tmpId: "producer",
        offset: { x: 0, y: 0 },
        components: [
          { id: "node", category: "runtime" },
          { id: "express", category: "framework" },
        ],
      },
      {
        name: "broker",
        kind: "queue",
        tmpId: "broker",
        offset: { x: 250, y: 50 },
        components: [{ id: "rabbitmq", category: "datastore" }],
      },
      {
        name: "worker",
        kind: "worker",
        tmpId: "worker",
        offset: { x: 500, y: 0 },
        components: [
          { id: "python", category: "language" },
          { id: "entry-queue-consumer", category: "entry-point" },
        ],
      },
    ],
    edges: [
      { from: "producer", to: "broker", protocol: "queue", topicName: "events" },
      { from: "broker", to: "worker", protocol: "queue", topicName: "events" },
    ],
  },
});
