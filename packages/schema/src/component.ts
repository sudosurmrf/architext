/**
 * @module @architext/schema/component
 * Concepts: [[Component]], [[ComponentCategory]], [[CatalogId]]
 * Spec: §3 JSON Spec Schema — Components; §7.1 Catalog entry schema
 * Depends on: [[primitives]] (IdSchema)
 * Consumed by: [[service]] (components array), [[@architext/catalog]] (entries reference these categories), [[@architext/files-engine]] (per-component file rules)
 */

import { z } from "zod";
import { IdSchema } from "./primitives";
import { BusinessContextSchema } from "./business-context";

export const ComponentCategorySchema = z.enum([
  "language",
  "runtime",
  "framework",
  "library",
  "build-tool",
  "datastore",
  "infrastructure",
  "ai",
  "workflow",
  "auth",
  "entry-point",
]);
export type ComponentCategory = z.infer<typeof ComponentCategorySchema>;

export const ComponentSchema = z.object({
  id: IdSchema,
  category: ComponentCategorySchema,
  version: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
  businessContext: BusinessContextSchema.optional(),
});
export type Component = z.infer<typeof ComponentSchema>;
