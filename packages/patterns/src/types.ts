/**
 * @module @architext/patterns/types
 * Concepts: [[Pattern]], [[SpecFragment]], [[PartialEntities]]
 * Spec: §7.4 Patterns library — Pattern and SpecFragment shapes; the fragment uses partial entities because ids and positions get filled in by [[instantiate]]
 * Depends on: [[@architext/schema]] (GroupKind, ServiceKind, Protocol), zod
 * Consumed by: [[instantiate]], each [[data/*]] pattern module
 */

import { z } from "zod";
import { GroupKindSchema, ServiceKindSchema, ProtocolSchema, ComponentCategorySchema } from "@architext/schema";

const PartialComponent = z
  .object({
    id: z.string().min(1),
    category: ComponentCategorySchema,
    version: z.string().min(1).optional(),
    config: z.record(z.unknown()).optional(),
  })
  .strict();

const PartialGroup = z
  .object({
    name: z.string().min(1),
    kind: GroupKindSchema,
    network: z.enum(["public", "private", "internal"]).optional(),
    // a temporary id used to wire `groupId` on services; stripped during instantiation
    tmpId: z.string().min(1).optional(),
  })
  .strict();

const PartialService = z
  .object({
    name: z.string().min(1),
    kind: ServiceKindSchema,
    components: z.array(PartialComponent).optional(),
    // a temporary id used to wire edges; stripped during instantiation
    tmpId: z.string().min(1).optional(),
    // a tmpId pointer to the group this service should belong to
    tmpGroupId: z.string().min(1).optional(),
    // relative position offset within the pattern (added to drop point)
    offset: z.object({ x: z.number(), y: z.number() }).optional(),
  })
  .strict();

const PartialEdge = z
  .object({
    from: z.string().min(1),       // tmpId pointer
    to: z.string().min(1),         // tmpId pointer
    protocol: ProtocolSchema,
    port: z.number().int().positive().optional(),
    basePath: z.string().optional(),
    path: z.string().optional(),
    topicName: z.string().min(1).optional(),
    broker: z.string().optional(),
    database: z.string().optional(),
    namespace: z.string().optional(),
    mountPath: z.string().optional(),
    eventBus: z.string().optional(),
    source: z.string().optional(),
    detailType: z.string().optional(),
    bucket: z.string().optional(),
    prefix: z.string().optional(),
    provider: z.string().optional(),
    scopes: z.array(z.string().min(1)).optional(),
    repository: z.string().optional(),
    tag: z.string().optional(),
    functionName: z.string().optional(),
    invocationType: z.enum(["request-response", "event"]).optional(),
    qualifier: z.string().optional(),
    endpointVisibility: z.enum(["public", "private"]).optional(),
    authorizer: z.string().optional(),
    reviewType: z.enum(["approval", "edit", "evaluation", "escalation"]).optional(),
    assignee: z.string().optional(),
    sla: z.string().optional(),
    instructions: z.string().optional(),
    condition: z.string().optional(),
    branchLabel: z.string().optional(),
    fallback: z.boolean().optional(),
    domainName: z.string().optional(),
    recordType: z.string().optional(),
  })
  .strict();

export const SpecFragmentSchema = z
  .object({
    groups: z.array(PartialGroup).optional(),
    services: z.array(PartialService),
    edges: z.array(PartialEdge),
  })
  .strict();
export type SpecFragment = z.infer<typeof SpecFragmentSchema>;

export const PatternSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    iconUrl: z.string().url().optional(),
    preview: z.string().optional(),
    fragment: SpecFragmentSchema,
  })
  .strict();
export type Pattern = z.infer<typeof PatternSchema>;
