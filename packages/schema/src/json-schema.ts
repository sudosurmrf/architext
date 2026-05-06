/**
 * @module @architext/schema/json-schema
 * Concepts: [[JSONSchema]], [[StaticSchema]], [[EditorTooling]]
 * Spec: §3 JSON Spec Schema — schema design decision 6 (validation at three boundaries — JSON Schema is the static export)
 * Depends on: zod-to-json-schema, [[spec]] (ArchitextSpecShape, intentionally NOT the refined version)
 * Consumed by: editor IDEs (autocomplete on spec.json), future API consumers, downstream validators
 *
 * Important: this exports the JSON Schema for [[ArchitextSpecShape]] — the
 * shape *without* .superRefine cross-reference checks. JSON Schema cannot
 * express those constraints. Cross-reference validation is enforced at
 * runtime by [[ArchitextSpecSchema]] in [[spec]].
 *
 * The `name` option is intentionally omitted: with `name` set, zod-to-json-schema
 * wraps the schema under `definitions.<name>` and the top level becomes a $ref.
 * Consumers want the schema fields (type, required, properties) at the top level.
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { ArchitextSpecShape } from "./spec";

export const architextJsonSchema = zodToJsonSchema(ArchitextSpecShape, {
  $refStrategy: "none",
}) as Record<string, unknown> & {
  $schema?: string;
  type?: string;
  required?: string[];
  properties?: Record<string, unknown>;
};
