/**
 * @module @architext/schema/spec
 * Concepts: [[ArchitextSpec]], [[CrossReferenceValidation]], [[Contract]]
 * Spec: §3 JSON Spec Schema — top-level ArchitextSpec interface; schema design decision 6 (validation at three boundaries)
 * Depends on: [[version]], [[project]], [[group]], [[service]], [[edge]]
 * Consumed by: [[index]] (re-export), [[json-schema]] (uses Shape, not refined), [[@architext/cli]] (validates spec on apply), [[@architext/web]] (validates on canvas mutation)
 *
 * Note: this file currently exposes the shape-only schema. Cross-reference
 * validation (group↔service refs, edge from/to refs, no self-loops, unique ids)
 * is added on top via .superRefine in Task 11.
 */

import { z } from "zod";
import { SchemaVersionSchema } from "./version";
import { ProjectMetaSchema } from "./project";
import { GroupSchema } from "./group";
import { ServiceSchema } from "./service";
import { EdgeSchema } from "./edge";

export const ArchitextSpecShape = z.object({
  schemaVersion: SchemaVersionSchema,
  project: ProjectMetaSchema,
  groups: z.array(GroupSchema),
  services: z.array(ServiceSchema),
  edges: z.array(EdgeSchema),
});

// Until cross-reference validation is added, the public schema is the shape itself.
// Task 11 replaces this re-export with a `.superRefine`-augmented version.
export const ArchitextSpecSchema = ArchitextSpecShape;
export type ArchitextSpec = z.infer<typeof ArchitextSpecSchema>;
