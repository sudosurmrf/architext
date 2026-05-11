/**
 * @module @architext/schema/edge
 * Concepts: [[Edge]], [[Protocol]], [[DiscriminatedUnion]], [[TypedConnection]]
 * Spec: §3 JSON Spec Schema — Edges (discriminated union on protocol); §4.5 Edge creation; schema design decision 2 (TS+Zod narrow per protocol)
 * Depends on: [[primitives]] (IdSchema)
 * Consumed by: [[spec]] (edges array, cross-ref to services), [[@architext/web]] (edge config inspector), agent meta-prompt (per-protocol guidance)
 */

import { z } from "zod";
import { IdSchema } from "./primitives";
import { BusinessContextSchema } from "./business-context";

export const ProtocolSchema = z.enum([
  "http",
  "graphql",
  "grpc",
  "websocket",
  "queue",
  "sql",
  "key-value",
  "fs",
  "event",
  "object-storage",
  "identity",
  "secret",
  "container-image",
  "lambda-invoke",
  "human-review",
  "decision",
  "dns",
]);
export type Protocol = z.infer<typeof ProtocolSchema>;

const Base = z.object({
  id: IdSchema,
  from: IdSchema,
  to: IdSchema,
  businessContext: BusinessContextSchema.optional(),
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
  Base.extend({
    protocol: z.literal("event"),
    eventBus: z.string().optional(),
    source: z.string().optional(),
    detailType: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("object-storage"),
    bucket: z.string().optional(),
    prefix: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("identity"),
    provider: z.string().optional(),
    scopes: z.array(z.string().min(1)).optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("secret"),
    namespace: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("container-image"),
    repository: z.string().optional(),
    tag: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("lambda-invoke"),
    functionName: z.string().optional(),
    invocationType: z.enum(["request-response", "event"]).optional(),
    qualifier: z.string().optional(),
    endpointVisibility: z.enum(["public", "private"]).optional(),
    authorizer: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("human-review"),
    reviewType: z.enum(["approval", "edit", "evaluation", "escalation"]).optional(),
    assignee: z.string().optional(),
    sla: z.string().optional(),
    instructions: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("decision"),
    condition: z.string().optional(),
    branchLabel: z.string().optional(),
    fallback: z.boolean().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("dns"),
    domainName: z.string().optional(),
    recordType: z.string().optional(),
  }).strict(),
]);
export type Edge = z.infer<typeof EdgeSchema>;
