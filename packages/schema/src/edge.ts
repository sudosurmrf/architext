/**
 * @module @architext/schema/edge
 * Concepts: [[Edge]], [[Protocol]], [[DiscriminatedUnion]], [[TypedConnection]]
 * Spec: §3 JSON Spec Schema — Edges (discriminated union on protocol); §4.5 Edge creation; schema design decision 2 (TS+Zod narrow per protocol)
 * Depends on: [[primitives]] (IdSchema)
 * Consumed by: [[spec]] (edges array, cross-ref to services), [[@architext/web]] (edge config inspector), agent meta-prompt (per-protocol guidance)
 */

import { z } from "zod";
import { IdSchema } from "./primitives";

export const ProtocolSchema = z.enum([
  "http",
  "graphql",
  "grpc",
  "websocket",
  "queue",
  "sql",
  "key-value",
  "fs",
]);
export type Protocol = z.infer<typeof ProtocolSchema>;

const Base = z.object({
  id: IdSchema,
  from: IdSchema,
  to: IdSchema,
});

export const EdgeSchema = z.discriminatedUnion("protocol", [
  Base.extend({
    protocol: z.literal("http"),
    port: z.number().int().positive().optional(),
    basePath: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("graphql"),
    port: z.number().int().positive().optional(),
    path: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("grpc"),
    port: z.number().int().positive().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("websocket"),
    port: z.number().int().positive().optional(),
    path: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("queue"),
    topicName: z.string().min(1),
    broker: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("sql"),
    database: z.string().optional(),
    port: z.number().int().positive().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("key-value"),
    namespace: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("fs"),
    mountPath: z.string().optional(),
  }).strict(),
]);
export type Edge = z.infer<typeof EdgeSchema>;
