/**
 * @module @architext/schema/version
 * Concepts: [[SchemaVersion]], [[Versioning]], [[CompatibilityContract]]
 * Spec: §3 JSON Spec Schema — schema design decision 1 (mandatory semver-strict version)
 * Depends on: zod
 * Consumed by: [[spec]], [[index]], downstream [[@architext/cli]] (refuses unknown versions)
 */

import { z } from "zod";

export const SCHEMA_VERSION = "0.1.0" as const;

export const SchemaVersionSchema = z.literal(SCHEMA_VERSION);
export type SchemaVersion = z.infer<typeof SchemaVersionSchema>;
