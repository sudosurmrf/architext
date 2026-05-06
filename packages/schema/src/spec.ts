/**
 * @module @architext/schema/spec
 * Concepts: [[ArchitextSpec]], [[CrossReferenceValidation]], [[Contract]], [[SuperRefine]]
 * Spec: §3 JSON Spec Schema — top-level ArchitextSpec interface; schema design decision 6 (validation at three boundaries); §4.5 (no self-loops, no duplicate edges)
 * Depends on: [[version]], [[project]], [[group]], [[service]], [[edge]]
 * Consumed by: [[index]] (re-export), [[json-schema]] (uses Shape, not refined), [[@architext/cli]] (validates spec on apply), [[@architext/web]] (validates on canvas mutation)
 *
 * The Shape (no superRefine) is exported separately so [[json-schema]] can
 * generate a static JSON Schema from it — JSON Schema cannot express the
 * cross-reference rules, so those live only in the runtime Zod refinement.
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

export const ArchitextSpecSchema = ArchitextSpecShape.superRefine((spec, ctx) => {
  const serviceIds = new Set<string>();
  for (const [i, s] of spec.services.entries()) {
    if (serviceIds.has(s.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["services", i, "id"],
        message: `duplicate service id: ${s.id}`,
      });
    }
    serviceIds.add(s.id);
  }

  const groupIds = new Set<string>();
  for (const [i, g] of spec.groups.entries()) {
    if (groupIds.has(g.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groups", i, "id"],
        message: `duplicate group id: ${g.id}`,
      });
    }
    groupIds.add(g.id);

    for (const [j, sid] of g.serviceIds.entries()) {
      if (!serviceIds.has(sid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groups", i, "serviceIds", j],
          message: `group references unknown service id: ${sid}`,
        });
      }
    }
  }

  for (const [i, g] of spec.groups.entries()) {
    if (g.parentGroupId !== undefined) {
      if (!groupIds.has(g.parentGroupId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groups", i, "parentGroupId"],
          message: `group references unknown parent group id: ${g.parentGroupId}`,
        });
      }
      if (g.parentGroupId === g.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groups", i, "parentGroupId"],
          message: "group cannot be its own parent",
        });
      }
    }
  }

  for (const [i, s] of spec.services.entries()) {
    if (s.groupId !== undefined && !groupIds.has(s.groupId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["services", i, "groupId"],
        message: `service references unknown group id: ${s.groupId}`,
      });
    }
  }

  const edgeIds = new Set<string>();
  for (const [i, e] of spec.edges.entries()) {
    if (edgeIds.has(e.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", i, "id"],
        message: `duplicate edge id: ${e.id}`,
      });
    }
    edgeIds.add(e.id);
    if (e.from === e.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", i, "to"],
        message: "edge self-loops are not allowed (from must differ from to)",
      });
    }
    if (!serviceIds.has(e.from)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", i, "from"],
        message: `edge references unknown service id: ${e.from}`,
      });
    }
    if (!serviceIds.has(e.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", i, "to"],
        message: `edge references unknown service id: ${e.to}`,
      });
    }
  }
});

export type ArchitextSpec = z.infer<typeof ArchitextSpecSchema>;
