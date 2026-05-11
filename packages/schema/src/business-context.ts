/**
 * @module @architext/schema/business-context
 * Concepts: [[BusinessContext]], [[ImplementationIntent]]
 * Depends on: zod
 * Consumed by: [[project]], [[group]], [[component]], [[service]], [[edge]]
 */

import { z } from "zod";

const OptionalTextSchema = z.string().trim().min(1).optional();
const OptionalTextListSchema = z.array(z.string().trim().min(1)).optional();

export const BusinessContextSchema = z
  .object({
    purpose: OptionalTextSchema,
    businessRules: OptionalTextListSchema,
    inputs: OptionalTextListSchema,
    outputs: OptionalTextListSchema,
    edgeCases: OptionalTextListSchema,
    acceptanceCriteria: OptionalTextListSchema,
    notes: OptionalTextSchema,
  })
  .strict();

export type BusinessContext = z.infer<typeof BusinessContextSchema>;
