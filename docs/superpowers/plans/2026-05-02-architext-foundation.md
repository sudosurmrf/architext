# Architext Foundation (Monorepo + Schema Package) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the pnpm monorepo for Architext and ship a publish-ready `@architext/schema` package containing Zod schemas, TypeScript types, JSON Schema generation, and full test coverage for the v1 spec contract.

**Architecture:** Monorepo with pnpm workspaces. The schema package is pure: no runtime dependencies beyond Zod. Schemas are defined per entity (Position, Group, Service, Component, Edge, Spec) in their own files, composed in `spec.ts`. Types are derived via `z.infer`. JSON Schema is generated via `zod-to-json-schema` for downstream tooling. Build output is dual ESM/CJS via `tsup`.

**Tech Stack:** Node 20+, pnpm 9+, TypeScript 5.4+ strict, Zod 3.x, Vitest, tsup, zod-to-json-schema.

**Spec reference:** `docs/superpowers/specs/2026-05-02-architext-design.md` — primarily Sections 3 (JSON Spec Schema) and 6 (Tech Stack & Repository Layout).

---

## File Structure

This plan creates the following files. Each has one clear responsibility.

```
architext/
├── package.json                                  # root workspace config
├── pnpm-workspace.yaml                           # workspace package globs
├── tsconfig.base.json                            # shared TS config
├── .gitignore                                    # node_modules, dist, .superpowers/
├── README.md                                     # project overview
└── packages/
    └── schema/
        ├── package.json                          # @architext/schema manifest
        ├── tsconfig.json                         # extends tsconfig.base.json
        ├── tsup.config.ts                        # ESM/CJS dual build config
        ├── vitest.config.ts                      # test runner config
        ├── README.md                             # package overview, version policy
        ├── src/
        │   ├── index.ts                          # public re-exports only
        │   ├── version.ts                        # SCHEMA_VERSION constant
        │   ├── primitives.ts                     # Position, Size, IdSchema
        │   ├── project.ts                        # ProjectMetaSchema
        │   ├── group.ts                          # GroupKindSchema, GroupSchema
        │   ├── service.ts                        # ServiceKindSchema, ServiceSchema
        │   ├── component.ts                      # ComponentCategorySchema, ComponentSchema
        │   ├── edge.ts                           # ProtocolSchema, EdgeSchema (discriminated union)
        │   ├── spec.ts                           # ArchitextSpecSchema + cross-reference validation
        │   └── json-schema.ts                    # generates JSON Schema artifact from Zod
        └── tests/
            ├── version.test.ts
            ├── primitives.test.ts
            ├── project.test.ts
            ├── group.test.ts
            ├── service.test.ts
            ├── component.test.ts
            ├── edge.test.ts
            ├── spec.test.ts
            ├── round-trip.test.ts
            ├── cross-reference.test.ts
            ├── json-schema.test.ts
            └── fixtures/
                ├── golden-frontend-backend-db.json
                └── golden-microservices.json
```

**Why this split:** Each entity gets one source file + one test file. The discriminated union for edges is large enough to warrant its own file. `spec.ts` is the only file that knows about cross-references (group.serviceIds → service.id, edge.from/to → service.id) — keeping that logic in one place makes it easy to extend later.

---

## Task 1: Initialize monorepo skeleton

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Modify: `.gitignore` (it exists with a small starter set; replace with canonical content)
- Create: `README.md`

- [ ] **Step 1: Overwrite `.gitignore` with the canonical content**

The existing `.gitignore` (committed in the initial commit) contains `.env`, `.superpowers`, and `.claude`. Replace its contents entirely with the canonical set below to avoid duplicates and add the build-output entries this monorepo needs.

`.gitignore`:

```
node_modules/
dist/
.turbo/
*.tsbuildinfo
.DS_Store
.env
.env.local
.superpowers/
.claude/
```

Verify the file contents:

```bash
cat .gitignore
```

Expected: 9 lines matching the block above.

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Write root `package.json`**

```json
{
  "name": "architext",
  "version": "0.0.0",
  "private": true,
  "description": "Visual architecture editor that scaffolds projects via AI agents",
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "clean": "pnpm -r clean && rm -rf node_modules"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 4: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 5: Write `README.md`**

```markdown
# Architext

Visual architecture editor that produces a structured JSON spec of a software system, then hands it to an AI coding agent (Claude Code or Archon) to scaffold the actual repo.

## Status

Pre-implementation. See `docs/superpowers/specs/` for the design and `docs/superpowers/plans/` for the implementation plans.

## Repo layout

- `apps/web/` — canvas SPA (added in plan 4)
- `packages/schema/` — `@architext/schema`, the spec contract
- `packages/catalog/` — `@architext/catalog`, component definitions (added in plan 2)
- `packages/patterns/` — `@architext/patterns`, composite-drop templates (added in plan 2)
- `packages/files-engine/` — `@architext/files-engine`, deterministic file-tree rules (added in plan 2)
- `packages/cli/` — `@architext/cli`, the `npx architext` entry point (added in plan 3)
- `prompts/` — versioned meta-prompts for the agent (added in plan 3)

## Development

Requires Node 20+ and pnpm 9+.

```bash
pnpm install
pnpm test
pnpm build
```
```

- [ ] **Step 6: Install root deps**

Run: `pnpm install`
Expected: creates `pnpm-lock.yaml` and `node_modules/`. No errors.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore README.md pnpm-lock.yaml
git commit -m "chore: initialize pnpm monorepo skeleton"
```

---

## Task 2: Schema package skeleton

**Files:**
- Create: `packages/schema/package.json`
- Create: `packages/schema/tsconfig.json`
- Create: `packages/schema/tsup.config.ts`
- Create: `packages/schema/vitest.config.ts`
- Create: `packages/schema/README.md`
- Create: `packages/schema/src/index.ts`

- [ ] **Step 1: Write `packages/schema/package.json`**

```json
{
  "name": "@architext/schema",
  "version": "0.1.0",
  "description": "JSON spec contract for Architext — Zod schemas, TypeScript types, JSON Schema",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./json-schema": {
      "import": "./dist/json-schema.js",
      "require": "./dist/json-schema.cjs",
      "types": "./dist/json-schema.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.23.8",
    "zod-to-json-schema": "^3.23.0"
  },
  "devDependencies": {
    "tsup": "^8.0.2",
    "vitest": "^1.6.0",
    "typescript": "^5.4.5"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Write `packages/schema/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Write `packages/schema/tsup.config.ts`**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/json-schema.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
```

- [ ] **Step 4: Write `packages/schema/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 5: Write `packages/schema/README.md`**

```markdown
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
```

- [ ] **Step 6: Write `packages/schema/src/index.ts` (empty exports — to be filled by later tasks)**

```typescript
// Public API for @architext/schema.
// Each entity is defined in its own module; this file re-exports the surface.
export {};
```

- [ ] **Step 7: Install package deps**

Run: `pnpm install`
Expected: pnpm links the new package into the workspace and installs `zod`, `zod-to-json-schema`, `tsup`, `vitest`. No errors.

- [ ] **Step 8: Verify the package is recognized**

Run: `pnpm --filter @architext/schema run typecheck`
Expected: passes (the empty `index.ts` is valid TS).

- [ ] **Step 9: Commit**

```bash
git add packages/schema package.json pnpm-lock.yaml
git commit -m "chore(schema): scaffold @architext/schema package"
```

---

## Task 3: Define `SCHEMA_VERSION` constant

**Files:**
- Create: `packages/schema/src/version.ts`
- Create: `packages/schema/tests/version.test.ts`
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/version.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, SchemaVersionSchema } from "../src/version";

describe("SCHEMA_VERSION", () => {
  it("is the literal '0.1.0'", () => {
    expect(SCHEMA_VERSION).toBe("0.1.0");
  });

  it("SchemaVersionSchema accepts the constant", () => {
    expect(SchemaVersionSchema.safeParse(SCHEMA_VERSION).success).toBe(true);
  });

  it("SchemaVersionSchema rejects other strings", () => {
    expect(SchemaVersionSchema.safeParse("0.2.0").success).toBe(false);
    expect(SchemaVersionSchema.safeParse("1.0.0").success).toBe(false);
    expect(SchemaVersionSchema.safeParse("").success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @architext/schema test version`
Expected: fail — `Cannot find module '../src/version'`.

- [ ] **Step 3: Implement `version.ts`**

`packages/schema/src/version.ts`:

```typescript
import { z } from "zod";

export const SCHEMA_VERSION = "0.1.0" as const;

export const SchemaVersionSchema = z.literal(SCHEMA_VERSION);
export type SchemaVersion = z.infer<typeof SchemaVersionSchema>;
```

- [ ] **Step 4: Re-export from `index.ts`**

Update `packages/schema/src/index.ts`:

```typescript
export * from "./version";
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/version.ts packages/schema/src/index.ts packages/schema/tests/version.test.ts
git commit -m "feat(schema): add SCHEMA_VERSION constant and validator"
```

---

## Task 4: Define primitives (`Position`, `Size`, `IdSchema`)

**Files:**
- Create: `packages/schema/src/primitives.ts`
- Create: `packages/schema/tests/primitives.test.ts`
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/primitives.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { PositionSchema, SizeSchema, IdSchema } from "../src/primitives";

describe("PositionSchema", () => {
  it("accepts {x, y} numbers", () => {
    expect(PositionSchema.parse({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(PositionSchema.parse({ x: -10.5, y: 200 })).toEqual({ x: -10.5, y: 200 });
  });

  it("rejects non-number coordinates", () => {
    expect(PositionSchema.safeParse({ x: "0", y: 0 }).success).toBe(false);
    expect(PositionSchema.safeParse({ x: NaN, y: 0 }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(PositionSchema.safeParse({ x: 0 }).success).toBe(false);
    expect(PositionSchema.safeParse({}).success).toBe(false);
  });
});

describe("SizeSchema", () => {
  it("accepts non-negative width and height", () => {
    expect(SizeSchema.parse({ width: 100, height: 50 })).toEqual({ width: 100, height: 50 });
    expect(SizeSchema.parse({ width: 0, height: 0 })).toEqual({ width: 0, height: 0 });
  });

  it("rejects negative dimensions", () => {
    expect(SizeSchema.safeParse({ width: -1, height: 50 }).success).toBe(false);
    expect(SizeSchema.safeParse({ width: 100, height: -1 }).success).toBe(false);
  });
});

describe("IdSchema", () => {
  it("accepts non-empty strings up to 128 chars", () => {
    expect(IdSchema.parse("a")).toBe("a");
    expect(IdSchema.parse("svc-api-1")).toBe("svc-api-1");
    expect(IdSchema.parse("x".repeat(128))).toBe("x".repeat(128));
  });

  it("rejects empty strings, non-strings, and over-long ids", () => {
    expect(IdSchema.safeParse("").success).toBe(false);
    expect(IdSchema.safeParse(42).success).toBe(false);
    expect(IdSchema.safeParse("x".repeat(129)).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @architext/schema test primitives`
Expected: fail — `Cannot find module '../src/primitives'`.

- [ ] **Step 3: Implement `primitives.ts`**

`packages/schema/src/primitives.ts`:

```typescript
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
```

- [ ] **Step 4: Re-export from `index.ts`**

Update `packages/schema/src/index.ts`:

```typescript
export * from "./version";
export * from "./primitives";
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: all tests in `version.test.ts` and `primitives.test.ts` pass.

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/primitives.ts packages/schema/src/index.ts packages/schema/tests/primitives.test.ts
git commit -m "feat(schema): add Position, Size, and Id primitives"
```

---

## Task 5: Define `ProjectMeta`

**Files:**
- Create: `packages/schema/src/project.ts`
- Create: `packages/schema/tests/project.test.ts`
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/project.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ProjectMetaSchema } from "../src/project";

describe("ProjectMetaSchema", () => {
  it("accepts the minimal valid project", () => {
    const result = ProjectMetaSchema.parse({ name: "My App", slug: "my-app" });
    expect(result.name).toBe("My App");
    expect(result.slug).toBe("my-app");
  });

  it("accepts optional fields", () => {
    const result = ProjectMetaSchema.parse({
      name: "My App",
      slug: "my-app",
      description: "An app.",
      defaultBranch: "main",
    });
    expect(result.description).toBe("An app.");
    expect(result.defaultBranch).toBe("main");
  });

  it("requires name and slug", () => {
    expect(ProjectMetaSchema.safeParse({ slug: "x" }).success).toBe(false);
    expect(ProjectMetaSchema.safeParse({ name: "x" }).success).toBe(false);
  });

  it("rejects non-slug-safe slug values", () => {
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "Has Spaces" }).success).toBe(false);
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "Has/Slash" }).success).toBe(false);
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "" }).success).toBe(false);
  });

  it("accepts kebab-case and lowercase-with-numbers slugs", () => {
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "my-app-2" }).success).toBe(true);
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "abc123" }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @architext/schema test project`
Expected: fail — `Cannot find module '../src/project'`.

- [ ] **Step 3: Implement `project.ts`**

`packages/schema/src/project.ts`:

```typescript
import { z } from "zod";

const SlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ProjectMetaSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(SlugRegex, {
    message: "slug must be lowercase kebab-case, e.g. my-app",
  }),
  description: z.string().optional(),
  defaultBranch: z.string().min(1).optional(),
});

export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;
```

- [ ] **Step 4: Re-export from `index.ts`**

Update `packages/schema/src/index.ts`:

```typescript
export * from "./version";
export * from "./primitives";
export * from "./project";
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: all tests pass including 5 new ones.

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/project.ts packages/schema/src/index.ts packages/schema/tests/project.test.ts
git commit -m "feat(schema): add ProjectMeta with slug validation"
```

---

## Task 6: Define `GroupKind` and `Group`

**Files:**
- Create: `packages/schema/src/group.ts`
- Create: `packages/schema/tests/group.test.ts`
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/group.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { GroupKindSchema, GroupSchema } from "../src/group";

describe("GroupKindSchema", () => {
  it("accepts each documented kind", () => {
    const kinds = ["frontend", "backend", "data", "workers", "external", "sidecars", "custom"];
    for (const k of kinds) {
      expect(GroupKindSchema.safeParse(k).success).toBe(true);
    }
  });

  it("rejects unknown kinds", () => {
    expect(GroupKindSchema.safeParse("nope").success).toBe(false);
  });
});

describe("GroupSchema", () => {
  const valid = {
    id: "g1",
    name: "Backend",
    kind: "backend",
    serviceIds: ["s1", "s2"],
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
  };

  it("accepts the minimal valid group", () => {
    expect(GroupSchema.parse(valid)).toMatchObject(valid);
  });

  it("accepts optional network field", () => {
    const result = GroupSchema.parse({ ...valid, network: "private" });
    expect(result.network).toBe("private");
  });

  it("rejects unknown network values", () => {
    expect(GroupSchema.safeParse({ ...valid, network: "weird" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(GroupSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("allows empty serviceIds (a group can be created before services are added)", () => {
    expect(GroupSchema.safeParse({ ...valid, serviceIds: [] }).success).toBe(true);
  });

  it("rejects duplicate serviceIds", () => {
    expect(GroupSchema.safeParse({ ...valid, serviceIds: ["s1", "s1"] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @architext/schema test group`
Expected: fail — `Cannot find module '../src/group'`.

- [ ] **Step 3: Implement `group.ts`**

`packages/schema/src/group.ts`:

```typescript
import { z } from "zod";
import { IdSchema, PositionSchema, SizeSchema } from "./primitives";

export const GroupKindSchema = z.enum([
  "frontend",
  "backend",
  "data",
  "workers",
  "external",
  "sidecars",
  "custom",
]);
export type GroupKind = z.infer<typeof GroupKindSchema>;

export const GroupNetworkSchema = z.enum(["public", "private", "internal"]);
export type GroupNetwork = z.infer<typeof GroupNetworkSchema>;

export const GroupSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  kind: GroupKindSchema,
  serviceIds: z
    .array(IdSchema)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      { message: "serviceIds must be unique" }
    ),
  position: PositionSchema,
  size: SizeSchema,
  network: GroupNetworkSchema.optional(),
});
export type Group = z.infer<typeof GroupSchema>;
```

- [ ] **Step 4: Re-export from `index.ts`**

Update `packages/schema/src/index.ts`:

```typescript
export * from "./version";
export * from "./primitives";
export * from "./project";
export * from "./group";
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: all tests pass including the 8 group tests.

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/group.ts packages/schema/src/index.ts packages/schema/tests/group.test.ts
git commit -m "feat(schema): add Group and GroupKind"
```

---

## Task 7: Define `ComponentCategory` and `Component`

**Files:**
- Create: `packages/schema/src/component.ts`
- Create: `packages/schema/tests/component.test.ts`
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/component.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ComponentCategorySchema, ComponentSchema } from "../src/component";

describe("ComponentCategorySchema", () => {
  it("accepts each documented category", () => {
    const categories = [
      "language",
      "runtime",
      "framework",
      "library",
      "build-tool",
      "datastore",
      "auth",
      "entry-point",
    ];
    for (const c of categories) {
      expect(ComponentCategorySchema.safeParse(c).success).toBe(true);
    }
  });

  it("rejects unknown categories", () => {
    expect(ComponentCategorySchema.safeParse("plugin").success).toBe(false);
  });
});

describe("ComponentSchema", () => {
  const minimal = { id: "react", category: "library" };

  it("accepts the minimal valid component", () => {
    expect(ComponentSchema.parse(minimal)).toMatchObject(minimal);
  });

  it("accepts optional version and config", () => {
    const result = ComponentSchema.parse({
      ...minimal,
      version: "^18.3.0",
      config: { strictMode: true },
    });
    expect(result.version).toBe("^18.3.0");
    expect(result.config).toEqual({ strictMode: true });
  });

  it("rejects empty id", () => {
    expect(ComponentSchema.safeParse({ id: "", category: "library" }).success).toBe(false);
  });

  it("rejects unknown category", () => {
    expect(ComponentSchema.safeParse({ id: "x", category: "weird" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @architext/schema test component`
Expected: fail — `Cannot find module '../src/component'`.

- [ ] **Step 3: Implement `component.ts`**

`packages/schema/src/component.ts`:

```typescript
import { z } from "zod";
import { IdSchema } from "./primitives";

export const ComponentCategorySchema = z.enum([
  "language",
  "runtime",
  "framework",
  "library",
  "build-tool",
  "datastore",
  "auth",
  "entry-point",
]);
export type ComponentCategory = z.infer<typeof ComponentCategorySchema>;

export const ComponentSchema = z.object({
  id: IdSchema,
  category: ComponentCategorySchema,
  version: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
});
export type Component = z.infer<typeof ComponentSchema>;
```

- [ ] **Step 4: Re-export from `index.ts`**

Update `packages/schema/src/index.ts`:

```typescript
export * from "./version";
export * from "./primitives";
export * from "./project";
export * from "./group";
export * from "./component";
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/component.ts packages/schema/src/index.ts packages/schema/tests/component.test.ts
git commit -m "feat(schema): add Component and ComponentCategory"
```

---

## Task 8: Define `ServiceKind` and `Service`

**Files:**
- Create: `packages/schema/src/service.ts`
- Create: `packages/schema/tests/service.test.ts`
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/service.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ServiceKindSchema, ServiceSchema } from "../src/service";

describe("ServiceKindSchema", () => {
  it("accepts each documented kind", () => {
    const kinds = [
      "frontend-app",
      "backend-service",
      "worker",
      "database",
      "cache",
      "queue",
      "sidecar",
      "external-api",
    ];
    for (const k of kinds) {
      expect(ServiceKindSchema.safeParse(k).success).toBe(true);
    }
  });

  it("rejects unknown kinds", () => {
    expect(ServiceKindSchema.safeParse("nope").success).toBe(false);
  });
});

describe("ServiceSchema", () => {
  const valid = {
    id: "s1",
    name: "api",
    kind: "backend-service",
    position: { x: 0, y: 0 },
    components: [{ id: "fastapi", category: "framework" }],
  };

  it("accepts the minimal valid service", () => {
    expect(ServiceSchema.parse(valid)).toMatchObject(valid);
  });

  it("accepts optional groupId", () => {
    expect(ServiceSchema.parse({ ...valid, groupId: "g1" }).groupId).toBe("g1");
  });

  it("rejects empty name", () => {
    expect(ServiceSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("allows empty components", () => {
    expect(ServiceSchema.safeParse({ ...valid, components: [] }).success).toBe(true);
  });

  it("rejects components with duplicate ids", () => {
    expect(
      ServiceSchema.safeParse({
        ...valid,
        components: [
          { id: "react", category: "library" },
          { id: "react", category: "library" },
        ],
      }).success
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @architext/schema test service`
Expected: fail — `Cannot find module '../src/service'`.

- [ ] **Step 3: Implement `service.ts`**

`packages/schema/src/service.ts`:

```typescript
import { z } from "zod";
import { IdSchema, PositionSchema } from "./primitives";
import { ComponentSchema } from "./component";

export const ServiceKindSchema = z.enum([
  "frontend-app",
  "backend-service",
  "worker",
  "database",
  "cache",
  "queue",
  "sidecar",
  "external-api",
]);
export type ServiceKind = z.infer<typeof ServiceKindSchema>;

export const ServiceSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  kind: ServiceKindSchema,
  groupId: IdSchema.optional(),
  position: PositionSchema,
  components: z
    .array(ComponentSchema)
    .refine(
      (cs) => new Set(cs.map((c) => c.id)).size === cs.length,
      { message: "components must have unique ids within a service" }
    ),
});
export type Service = z.infer<typeof ServiceSchema>;
```

- [ ] **Step 4: Re-export from `index.ts`**

Update `packages/schema/src/index.ts`:

```typescript
export * from "./version";
export * from "./primitives";
export * from "./project";
export * from "./group";
export * from "./component";
export * from "./service";
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/service.ts packages/schema/src/index.ts packages/schema/tests/service.test.ts
git commit -m "feat(schema): add Service and ServiceKind"
```

---

## Task 9: Define `Protocol` enum and `Edge` discriminated union

**Files:**
- Create: `packages/schema/src/edge.ts`
- Create: `packages/schema/tests/edge.test.ts`
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/edge.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ProtocolSchema, EdgeSchema } from "../src/edge";

describe("ProtocolSchema", () => {
  it("accepts each documented protocol", () => {
    const ps = ["http", "graphql", "grpc", "websocket", "queue", "sql", "key-value", "fs"];
    for (const p of ps) {
      expect(ProtocolSchema.safeParse(p).success).toBe(true);
    }
  });

  it("rejects unknown protocols", () => {
    expect(ProtocolSchema.safeParse("smtp").success).toBe(false);
  });
});

describe("EdgeSchema (discriminated union)", () => {
  const baseId = { id: "e1", from: "s1", to: "s2" };

  it("accepts http with optional fields", () => {
    expect(EdgeSchema.safeParse({ ...baseId, protocol: "http" }).success).toBe(true);
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "http", port: 8080, basePath: "/api" }).success
    ).toBe(true);
  });

  it("accepts queue with required topicName", () => {
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "queue", topicName: "events" }).success
    ).toBe(true);
  });

  it("rejects queue without topicName", () => {
    expect(EdgeSchema.safeParse({ ...baseId, protocol: "queue" }).success).toBe(false);
  });

  it("rejects http with queue-only fields", () => {
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "http", topicName: "x" }).success
    ).toBe(false);
  });

  it("rejects queue with http-only fields", () => {
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "queue", topicName: "x", basePath: "/api" })
        .success
    ).toBe(false);
  });

  it("accepts sql with optional database and port", () => {
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "sql", database: "app", port: 5432 }).success
    ).toBe(true);
  });

  it("rejects unknown protocol", () => {
    expect(EdgeSchema.safeParse({ ...baseId, protocol: "smtp" }).success).toBe(false);
  });

  it("rejects empty from/to", () => {
    expect(EdgeSchema.safeParse({ id: "e1", from: "", to: "s2", protocol: "http" }).success).toBe(false);
    expect(EdgeSchema.safeParse({ id: "e1", from: "s1", to: "", protocol: "http" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @architext/schema test edge`
Expected: fail — `Cannot find module '../src/edge'`.

- [ ] **Step 3: Implement `edge.ts`**

`packages/schema/src/edge.ts`:

```typescript
import { z } from "zod";
import { IdSchema } from "./primitives";

export const ProtocolSchema = z.enum([
  "http",
  "graphql",
  "grpc",
  "websocket",
  "queue",
  "sql",
  "key-value",
  "fs",
]);
export type Protocol = z.infer<typeof ProtocolSchema>;

const Base = z.object({
  id: IdSchema,
  from: IdSchema,
  to: IdSchema,
});

export const EdgeSchema = z.discriminatedUnion("protocol", [
  Base.extend({
    protocol: z.literal("http"),
    port: z.number().int().positive().optional(),
    basePath: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("graphql"),
    port: z.number().int().positive().optional(),
    path: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("grpc"),
    port: z.number().int().positive().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("websocket"),
    port: z.number().int().positive().optional(),
    path: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("queue"),
    topicName: z.string().min(1),
    broker: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("sql"),
    database: z.string().optional(),
    port: z.number().int().positive().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("key-value"),
    namespace: z.string().optional(),
  }).strict(),
  Base.extend({
    protocol: z.literal("fs"),
    mountPath: z.string().optional(),
  }).strict(),
]);
export type Edge = z.infer<typeof EdgeSchema>;
```

- [ ] **Step 4: Re-export from `index.ts`**

Update `packages/schema/src/index.ts`:

```typescript
export * from "./version";
export * from "./primitives";
export * from "./project";
export * from "./group";
export * from "./component";
export * from "./service";
export * from "./edge";
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: all tests pass — the discriminated union with `.strict()` enforces protocol-specific fields exactly.

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/edge.ts packages/schema/src/index.ts packages/schema/tests/edge.test.ts
git commit -m "feat(schema): add Edge discriminated union with protocol-specific configs"
```

---

## Task 10: Define `ArchitextSpec` (top-level, no cross-references yet)

**Files:**
- Create: `packages/schema/src/spec.ts`
- Create: `packages/schema/tests/spec.test.ts`
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/spec.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ArchitextSpecSchema } from "../src/spec";
import { SCHEMA_VERSION } from "../src/version";

const minimal = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "X", slug: "x" },
  groups: [],
  services: [],
  edges: [],
};

describe("ArchitextSpecSchema (shape-only)", () => {
  it("accepts the empty-but-valid spec", () => {
    expect(ArchitextSpecSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects missing schemaVersion", () => {
    const bad = { ...minimal } as Record<string, unknown>;
    delete bad.schemaVersion;
    expect(ArchitextSpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    expect(
      ArchitextSpecSchema.safeParse({ ...minimal, schemaVersion: "0.2.0" }).success
    ).toBe(false);
  });

  it("rejects missing top-level arrays", () => {
    const bad = { ...minimal } as Record<string, unknown>;
    delete bad.services;
    expect(ArchitextSpecSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a populated spec (no cross-refs yet — those come later)", () => {
    const populated = {
      ...minimal,
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          position: { x: 0, y: 0 },
          components: [{ id: "fastapi", category: "framework" }],
        },
      ],
    };
    expect(ArchitextSpecSchema.safeParse(populated).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @architext/schema test spec`
Expected: fail — `Cannot find module '../src/spec'`.

- [ ] **Step 3: Implement `spec.ts`**

`packages/schema/src/spec.ts`:

```typescript
import { z } from "zod";
import { SchemaVersionSchema } from "./version";
import { ProjectMetaSchema } from "./project";
import { GroupSchema } from "./group";
import { ServiceSchema } from "./service";
import { EdgeSchema } from "./edge";

// Shape-only schema. Cross-reference validation (group.serviceIds → service.id,
// edge.from/to → service.id, unique ids across the spec) lives on
// ArchitextSpecSchema below as a `.superRefine` step added in Task 11.

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
```

- [ ] **Step 4: Re-export from `index.ts`**

Update `packages/schema/src/index.ts`:

```typescript
export * from "./version";
export * from "./primitives";
export * from "./project";
export * from "./group";
export * from "./component";
export * from "./service";
export * from "./edge";
export * from "./spec";
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/spec.ts packages/schema/src/index.ts packages/schema/tests/spec.test.ts
git commit -m "feat(schema): add ArchitextSpec shape (cross-refs in next task)"
```

---

## Task 11: Add cross-reference validation to `ArchitextSpec`

**Files:**
- Modify: `packages/schema/src/spec.ts`
- Create: `packages/schema/tests/cross-reference.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/cross-reference.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ArchitextSpecSchema } from "../src/spec";
import { SCHEMA_VERSION } from "../src/version";

const baseGroup = {
  id: "g1",
  name: "Backend",
  kind: "backend" as const,
  position: { x: 0, y: 0 },
  size: { width: 400, height: 300 },
};

const baseService = {
  id: "api",
  name: "api",
  kind: "backend-service" as const,
  position: { x: 0, y: 0 },
  components: [],
};

const ok = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "X", slug: "x" },
  groups: [],
  services: [],
  edges: [],
};

describe("Cross-reference validation", () => {
  it("rejects duplicate service ids across the spec", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services: [
        { ...baseService, id: "api" },
        { ...baseService, id: "api", name: "duplicate" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate group ids across the spec", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      groups: [
        { ...baseGroup, serviceIds: [] },
        { ...baseGroup, serviceIds: [] },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate edge ids", () => {
    const services = [
      { ...baseService, id: "a" },
      { ...baseService, id: "b" },
    ];
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services,
      edges: [
        { id: "e1", from: "a", to: "b", protocol: "http" },
        { id: "e1", from: "a", to: "b", protocol: "http" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects group.serviceIds that don't reference a real service", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      groups: [{ ...baseGroup, serviceIds: ["ghost"] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects service.groupId that doesn't reference a real group", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services: [{ ...baseService, groupId: "ghost" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects edge.from / edge.to that don't reference a real service", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services: [{ ...baseService, id: "api" }],
      edges: [{ id: "e1", from: "api", to: "ghost", protocol: "http" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects edge self-loops (from === to)", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      services: [{ ...baseService, id: "api" }],
      edges: [{ id: "e1", from: "api", to: "api", protocol: "http" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fully consistent spec", () => {
    const result = ArchitextSpecSchema.safeParse({
      ...ok,
      groups: [{ ...baseGroup, serviceIds: ["api", "db"] }],
      services: [
        { ...baseService, id: "api", groupId: "g1" },
        { ...baseService, id: "db", kind: "database", groupId: "g1" },
      ],
      edges: [{ id: "e1", from: "api", to: "db", protocol: "sql" }],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm --filter @architext/schema test cross-reference`
Expected: most tests fail — the current `ArchitextSpecSchema` does not enforce cross-references.

- [ ] **Step 3: Replace `ArchitextSpecSchema` with a `.superRefine`-augmented version**

Replace the body of `packages/schema/src/spec.ts` with:

```typescript
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: all tests pass — including the 8 cross-reference tests.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/spec.ts packages/schema/tests/cross-reference.test.ts
git commit -m "feat(schema): enforce cross-references and reject self-loops"
```

---

## Task 12: Round-trip serialization test with fixtures

**Files:**
- Create: `packages/schema/tests/fixtures/golden-frontend-backend-db.json`
- Create: `packages/schema/tests/fixtures/golden-microservices.json`
- Create: `packages/schema/tests/round-trip.test.ts`

- [ ] **Step 1: Write golden fixture 1 (frontend + backend + db)**

`packages/schema/tests/fixtures/golden-frontend-backend-db.json`:

```json
{
  "schemaVersion": "0.1.0",
  "project": { "name": "Notes App", "slug": "notes-app" },
  "groups": [
    {
      "id": "g-be",
      "name": "Backend",
      "kind": "backend",
      "serviceIds": ["api", "db"],
      "position": { "x": 400, "y": 100 },
      "size": { "width": 500, "height": 300 },
      "network": "private"
    }
  ],
  "services": [
    {
      "id": "web",
      "name": "web",
      "kind": "frontend-app",
      "position": { "x": 50, "y": 100 },
      "components": [
        { "id": "typescript", "category": "language" },
        { "id": "react", "category": "library", "version": "^18.3.0" },
        { "id": "vite", "category": "build-tool" }
      ]
    },
    {
      "id": "api",
      "name": "api",
      "kind": "backend-service",
      "groupId": "g-be",
      "position": { "x": 450, "y": 150 },
      "components": [
        { "id": "python", "category": "language" },
        { "id": "fastapi", "category": "framework" }
      ]
    },
    {
      "id": "db",
      "name": "db",
      "kind": "database",
      "groupId": "g-be",
      "position": { "x": 700, "y": 250 },
      "components": [{ "id": "postgres", "category": "datastore" }]
    }
  ],
  "edges": [
    { "id": "e1", "from": "web", "to": "api", "protocol": "http", "port": 8000, "basePath": "/api" },
    { "id": "e2", "from": "api", "to": "db", "protocol": "sql", "database": "notes", "port": 5432 }
  ]
}
```

- [ ] **Step 2: Write golden fixture 2 (microservices with queue)**

`packages/schema/tests/fixtures/golden-microservices.json`:

```json
{
  "schemaVersion": "0.1.0",
  "project": { "name": "Pipeline", "slug": "pipeline" },
  "groups": [
    {
      "id": "g-svc",
      "name": "Services",
      "kind": "backend",
      "serviceIds": ["ingest", "processor"],
      "position": { "x": 100, "y": 100 },
      "size": { "width": 600, "height": 200 }
    }
  ],
  "services": [
    {
      "id": "ingest",
      "name": "ingest",
      "kind": "backend-service",
      "groupId": "g-svc",
      "position": { "x": 150, "y": 150 },
      "components": [
        { "id": "node", "category": "runtime" },
        { "id": "express", "category": "framework" }
      ]
    },
    {
      "id": "processor",
      "name": "processor",
      "kind": "worker",
      "groupId": "g-svc",
      "position": { "x": 450, "y": 150 },
      "components": [
        { "id": "python", "category": "language" }
      ]
    },
    {
      "id": "broker",
      "name": "broker",
      "kind": "queue",
      "position": { "x": 300, "y": 350 },
      "components": [{ "id": "rabbitmq", "category": "datastore" }]
    }
  ],
  "edges": [
    { "id": "e1", "from": "ingest", "to": "broker", "protocol": "queue", "topicName": "events.in" },
    { "id": "e2", "from": "broker", "to": "processor", "protocol": "queue", "topicName": "events.in" }
  ]
}
```

- [ ] **Step 3: Write the failing round-trip test**

`packages/schema/tests/round-trip.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ArchitextSpecSchema } from "../src/spec";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = ["golden-frontend-backend-db.json", "golden-microservices.json"];

describe("Round-trip", () => {
  for (const name of fixtures) {
    it(`parses, re-serializes, and re-parses ${name} to identical output`, () => {
      const raw = readFileSync(resolve(here, "fixtures", name), "utf-8");
      const parsed1 = ArchitextSpecSchema.parse(JSON.parse(raw));
      const reserialized = JSON.stringify(parsed1);
      const parsed2 = ArchitextSpecSchema.parse(JSON.parse(reserialized));
      expect(parsed2).toEqual(parsed1);
    });
  }
});
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test round-trip`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/tests/fixtures packages/schema/tests/round-trip.test.ts
git commit -m "test(schema): add golden fixtures and round-trip test"
```

---

## Task 13: Generate JSON Schema artifact

**Files:**
- Create: `packages/schema/src/json-schema.ts`
- Create: `packages/schema/tests/json-schema.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/schema/tests/json-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { architextJsonSchema } from "../src/json-schema";

describe("JSON Schema export", () => {
  it("returns an object with $schema and type=object", () => {
    expect(architextJsonSchema.$schema).toBeDefined();
    expect(architextJsonSchema.type).toBe("object");
  });

  it("includes the top-level required fields", () => {
    const required = architextJsonSchema.required ?? [];
    expect(required).toContain("schemaVersion");
    expect(required).toContain("project");
    expect(required).toContain("groups");
    expect(required).toContain("services");
    expect(required).toContain("edges");
  });

  it("includes the schemaVersion enum/const for 0.1.0", () => {
    const props = architextJsonSchema.properties as Record<string, { const?: string; enum?: string[] }>;
    const v = props.schemaVersion;
    const isLiteral = v.const === "0.1.0" || (v.enum?.length === 1 && v.enum[0] === "0.1.0");
    expect(isLiteral).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @architext/schema test json-schema`
Expected: fail — `Cannot find module '../src/json-schema'`.

- [ ] **Step 3: Implement `json-schema.ts`**

`packages/schema/src/json-schema.ts`:

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";
import { ArchitextSpecShape } from "./spec";

// We export the JSON Schema generated from the *shape* (without the .superRefine
// cross-reference checks) because JSON Schema cannot express those constraints.
// Cross-reference validation is enforced at runtime by ArchitextSpecSchema.
export const architextJsonSchema = zodToJsonSchema(ArchitextSpecShape, {
  name: "ArchitextSpec",
  $refStrategy: "none",
}) as Record<string, unknown> & {
  $schema?: string;
  type?: string;
  required?: string[];
  properties?: Record<string, unknown>;
};
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm --filter @architext/schema test`
Expected: all tests pass, including 3 in `json-schema.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/json-schema.ts packages/schema/tests/json-schema.test.ts
git commit -m "feat(schema): generate JSON Schema artifact from Zod shape"
```

---

## Task 14: Verify build artifact and `pnpm publish --dry-run`

**Files (verification only):**
- No file changes; verify outputs.

- [ ] **Step 1: Build the package**

Run: `pnpm --filter @architext/schema build`
Expected: produces `packages/schema/dist/` with `index.js`, `index.cjs`, `index.d.ts`, `json-schema.js`, `json-schema.cjs`, `json-schema.d.ts`, plus source maps.

- [ ] **Step 2: Inspect the dist output**

Run: `ls -1 packages/schema/dist/`
Expected output (order may vary):

```
index.cjs
index.cjs.map
index.d.cts
index.d.ts
index.js
index.js.map
json-schema.cjs
json-schema.cjs.map
json-schema.d.cts
json-schema.d.ts
json-schema.js
json-schema.js.map
```

- [ ] **Step 3: Type-check the package**

Run: `pnpm --filter @architext/schema typecheck`
Expected: no errors.

- [ ] **Step 4: Run all tests one more time**

Run: `pnpm --filter @architext/schema test`
Expected: all tests pass.

- [ ] **Step 5: Verify publish would succeed**

Run: `pnpm --filter @architext/schema pack --pack-destination /tmp`
Expected: produces `/tmp/architext-schema-0.1.0.tgz`. Inspect contents:

Run: `tar -tzf /tmp/architext-schema-0.1.0.tgz | head -30`
Expected: includes `package/dist/index.js`, `package/dist/index.cjs`, `package/dist/index.d.ts`, `package/README.md`, `package/package.json`. Does NOT include `package/src/` or `package/tests/`.

- [ ] **Step 6: Clean up tarball**

Run: `rm /tmp/architext-schema-0.1.0.tgz`

- [ ] **Step 7: Commit (no file changes — record verification in commit message via empty commit)**

Skip this step if there's nothing to commit. Otherwise (e.g., if `dist/` somehow ended up tracked):

```bash
git status
```

If `git status` shows untracked artifacts that shouldn't be tracked, ensure `.gitignore` covers them.

---

## Task 15: Final integration smoke test

**Files:**
- Create: `packages/schema/tests/integration.test.ts`

- [ ] **Step 1: Write the integration test**

`packages/schema/tests/integration.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  ArchitextSpecSchema,
  SCHEMA_VERSION,
  type ArchitextSpec,
  type Service,
  type Edge,
} from "../src";
import { architextJsonSchema } from "../src/json-schema";

const here = dirname(fileURLToPath(import.meta.url));

describe("Public API integration", () => {
  it("exports SCHEMA_VERSION as 0.1.0", () => {
    expect(SCHEMA_VERSION).toBe("0.1.0");
  });

  it("validates a real-world golden fixture end-to-end", () => {
    const raw = readFileSync(
      resolve(here, "fixtures", "golden-frontend-backend-db.json"),
      "utf-8"
    );
    const spec: ArchitextSpec = ArchitextSpecSchema.parse(JSON.parse(raw));

    expect(spec.services).toHaveLength(3);
    const api: Service | undefined = spec.services.find((s) => s.id === "api");
    expect(api?.kind).toBe("backend-service");

    const sqlEdge: Edge | undefined = spec.edges.find((e) => e.protocol === "sql");
    expect(sqlEdge).toBeDefined();
    if (sqlEdge?.protocol === "sql") {
      expect(sqlEdge.database).toBe("notes");
    }
  });

  it("exports a JSON Schema with the expected top-level keys", () => {
    expect(architextJsonSchema.type).toBe("object");
    expect(architextJsonSchema.required).toEqual(
      expect.arrayContaining(["schemaVersion", "project", "groups", "services", "edges"])
    );
  });
});
```

- [ ] **Step 2: Run all tests one final time**

Run: `pnpm --filter @architext/schema test`
Expected: every test in the package passes.

- [ ] **Step 3: Run the full repo build**

Run: `pnpm build`
Expected: only the schema package has a build, and it succeeds.

- [ ] **Step 4: Run the full repo typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/tests/integration.test.ts
git commit -m "test(schema): add public API integration smoke test"
```

---

## Self-Review Checklist (run after final commit)

This is a quick sanity pass — fix issues inline.

- [ ] **Spec coverage:** Section 3 of the spec (`docs/superpowers/specs/2026-05-02-architext-design.md`) defines `ArchitextSpec`, `ProjectMeta`, `Group`, `Service`, `Component`, `Edge`. Each is implemented and tested in this plan (Tasks 5–11). The schema version constant from Section 3 is implemented (Task 3). JSON Schema generation is implemented (Task 13). Cross-reference rules are implemented (Task 11).

- [ ] **Reserved-fields posture:** The spec lists reserved fields (`contracts`, `replicas`, `containerization`, `deployTarget`, `envTier`) as v1.5+. None of these are added in this plan. Confirm by grepping:

  ```bash
  grep -nE "contracts|replicas|containerization|deployTarget|envTier" packages/schema/src/ || echo "OK — no reserved fields leaked"
  ```

  Expected: `OK — no reserved fields leaked`.

- [ ] **Type consistency:** The plan uses one canonical name per concept: `ArchitextSpec`, `ArchitextSpecSchema`, `ArchitextSpecShape`, `Group`, `GroupSchema`, `GroupKindSchema`, etc. No drift between tasks.

- [ ] **No placeholders:** Search the plan file for "TBD", "TODO", "XXX". Expected: none.

  ```bash
  grep -nE "TBD|TODO|FIXME|XXX" docs/superpowers/plans/2026-05-02-architext-foundation.md || echo "OK — no placeholders"
  ```

- [ ] **Final state:** `pnpm install && pnpm test && pnpm build && pnpm typecheck` all succeed at HEAD.

---

## What This Plan Delivers

After completion of all 15 tasks:

- A working pnpm monorepo with `package.json`, `pnpm-workspace.yaml`, and `tsconfig.base.json`.
- A complete `@architext/schema` package containing:
  - Full Zod schemas for `ArchitextSpec`, `Group`, `Service`, `Component`, `Edge` (typed discriminated union over 8 protocols), `ProjectMeta`, primitives.
  - TypeScript types derived from the Zod schemas via `z.infer`.
  - Cross-reference validation enforcing unique ids and valid references between groups, services, and edges.
  - JSON Schema artifact for downstream tooling.
  - Comprehensive test coverage: per-entity unit tests, cross-reference tests, round-trip serialization tests against 2 golden fixtures, public-API integration test.
  - Dual ESM/CJS build via `tsup`, ready for `pnpm publish`.
- Two golden spec fixtures (`golden-frontend-backend-db.json`, `golden-microservices.json`) reused by every downstream package's tests.

This is the **contract** that all subsequent plans (catalog, files-engine, CLI, web app) will import from. With this in place, the next plan can begin building on a stable foundation.
