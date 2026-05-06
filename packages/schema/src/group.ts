/**
 * @module @architext/schema/group
 * Concepts: [[Group]], [[GroupKind]], [[Network]], [[LogicalContainer]]
 * Spec: §3 JSON Spec Schema — Groups; §4.3 Drop rules (group nesting forbidden in v1)
 * Depends on: [[primitives]] (IdSchema, PositionSchema, SizeSchema)
 * Consumed by: [[spec]] (cross-ref to services), [[@architext/web]] (canvas frame nodes), [[@architext/files-engine]] (group→directory rules)
 */

import { z } from "zod";
import { IdSchema, PositionSchema, SizeSchema } from "./primitives";

export const GroupKindSchema = z.enum([
  "frontend",
  "backend",
  "data",
  "workers",
  "external",
  "sidecars",
  "custom",
]);
export type GroupKind = z.infer<typeof GroupKindSchema>;

export const GroupNetworkSchema = z.enum(["public", "private", "internal"]);
export type GroupNetwork = z.infer<typeof GroupNetworkSchema>;

export const GroupSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  kind: GroupKindSchema,
  serviceIds: z
    .array(IdSchema)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      { message: "serviceIds must be unique" }
    ),
  position: PositionSchema.optional(),
  size: SizeSchema.optional(),
  network: GroupNetworkSchema.optional(),
});
export type Group = z.infer<typeof GroupSchema>;
