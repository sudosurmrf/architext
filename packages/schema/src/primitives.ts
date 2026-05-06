/**
 * @module @architext/schema/primitives
 * Concepts: [[Position]], [[Size]], [[Id]], [[CanvasGeometry]]
 * Spec: §3 JSON Spec Schema — Position/Size types; schema design decision 3 (canvas position lives in spec)
 * Depends on: zod
 * Consumed by: [[group]] (Position+Size), [[service]] (Position), [[edge]] (Id), every entity needing an id
 */

import { z } from "zod";

export const PositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});
export type Position = z.infer<typeof PositionSchema>;

export const SizeSchema = z.object({
  width: z.number().finite().nonnegative(),
  height: z.number().finite().nonnegative(),
});
export type Size = z.infer<typeof SizeSchema>;

export const IdSchema = z.string().min(1).max(128);
export type Id = z.infer<typeof IdSchema>;
