# @architext/schema

JSON spec contract for [Architext](../../README.md).

This package is the **single source of truth** for what a valid Architext spec looks like. It exports Zod runtime validators, TypeScript types derived from those validators, and a JSON Schema artifact for downstream tooling.

## Version policy

The package version matches the `schemaVersion` field of the specs it validates. `@architext/schema@0.1.0` accepts only `schemaVersion: "0.1.0"` specs. Adding fields = patch bump. New optional fields = minor bump. Breaking changes = major bump.

## Usage

```typescript
import { ArchitextSpecSchema, type ArchitextSpec } from "@architext/schema";

const result = ArchitextSpecSchema.safeParse(json);
if (!result.success) {
  console.error(result.error.format());
} else {
  const spec: ArchitextSpec = result.data;
}
```
