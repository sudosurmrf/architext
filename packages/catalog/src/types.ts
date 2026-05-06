/**
 * @module @architext/catalog/types
 * Concepts: [[CatalogEntry]], [[FileRule]], [[DropsAs]], [[DiscriminatedUnion]]
 * Spec: §7.1 Catalog entry schema; §4.4 Component compatibility (compatibleServiceKinds)
 * Depends on: [[@architext/schema]] (ComponentCategorySchema, ServiceKindSchema), zod
 * Consumed by: [[catalog]] (helpers), [[load]] (validation), each [[data]] module (parse on init)
 */

import { z } from "zod";
import { ComponentCategorySchema, ServiceKindSchema } from "@architext/schema";

export const FileRuleSchema = z.object({
  path: z.string().min(1),
  when: z
    .object({
      serviceKind: z.array(ServiceKindSchema).optional(),
      requires: z.array(z.string().min(1)).optional(),
      excludes: z.array(z.string().min(1)).optional(),
    })
    .optional(),
});
export type FileRule = z.infer<typeof FileRuleSchema>;

const Base = z.object({
  id: z.string().min(1),
  category: ComponentCategorySchema,
  name: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)),
  files: z.array(FileRuleSchema).optional(),
  defaultConfig: z.record(z.unknown()).optional(),
  defaultVersion: z.string().min(1).optional(),
  iconUrl: z.string().url().optional(),
});

export const CatalogEntrySchema = z.discriminatedUnion("dropsAs", [
  Base.extend({
    dropsAs: z.literal("component"),
    compatibleServiceKinds: z.array(ServiceKindSchema).min(1),
  }).strict(),
  Base.extend({
    dropsAs: z.literal("service"),
    serviceKindIfService: ServiceKindSchema,
  }).strict(),
]);
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
