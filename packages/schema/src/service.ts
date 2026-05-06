/**
 * @module @architext/schema/service
 * Concepts: [[Service]], [[ServiceKind]], [[DeployableUnit]]
 * Spec: §3 JSON Spec Schema — Services; §4.4 Component compatibility (per-kind allowlists)
 * Depends on: [[primitives]] (IdSchema, PositionSchema), [[component]] (ComponentSchema)
 * Consumed by: [[spec]] (services array, cross-refs), [[edge]] (from/to references), [[@architext/files-engine]] (service→directory)
 */

import { z } from "zod";
import { IdSchema, PositionSchema } from "./primitives";
import { ComponentSchema } from "./component";

export const ServiceKindSchema = z.enum([
  "frontend-app",
  "backend-service",
  "worker",
  "database",
  "cache",
  "queue",
  "sidecar",
  "external-api",
]);
export type ServiceKind = z.infer<typeof ServiceKindSchema>;

export const ServiceSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  kind: ServiceKindSchema,
  groupId: IdSchema.optional(),
  position: PositionSchema.optional(),
  components: z
    .array(ComponentSchema)
    .refine(
      (cs) => new Set(cs.map((c) => c.id)).size === cs.length,
      { message: "components must have unique ids within a service" }
    ),
});
export type Service = z.infer<typeof ServiceSchema>;
