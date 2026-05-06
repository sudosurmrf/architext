# Architext Catalog + Patterns + Files-Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three publish-ready data/rules packages that sit on top of `@architext/schema`: `@architext/catalog` (≥22 component definitions), `@architext/patterns` (≥5 composite-drop templates), and `@architext/files-engine` (deterministic file-tree predictor consumed by both the web app's Files tab and the CLI's prompt-enrichment pass).

**Architecture:** All three packages depend on `@architext/schema` via `workspace:*`. Catalog entries and patterns are authored as TS modules (each module exports an array of validated objects via the Zod schemas defined in this plan), so malformed entries fail typecheck/test, not silently at runtime. Files-engine is a single pure function `computeFileTree(spec, catalog) → FileTree` — no I/O, no side effects, fully deterministic and snapshot-tested.

**Tech Stack:** Same as Plan 1 — Node 20+, pnpm 10+, TypeScript 5.4+ strict, Zod 3.x, Vitest, tsup. Plus `workspace:*` linking against `@architext/schema`.

**Spec reference:** `docs/superpowers/specs/2026-05-02-architext-design.md` — primarily Section 7 (Catalog, Files Rules, Patterns) and Section 4.4 (Component compatibility).

---

## File Structure

This plan creates the following files. Each has one clear responsibility.

```
architext/
└── packages/
    ├── catalog/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── tsup.config.ts
    │   ├── vitest.config.ts
    │   ├── README.md
    │   ├── src/
    │   │   ├── index.ts                       # public re-exports
    │   │   ├── types.ts                       # CatalogEntrySchema, FileRuleSchema (discriminated on dropsAs)
    │   │   ├── catalog.ts                     # Catalog type + helpers (byId, byCategory, byCompatibleServiceKind)
    │   │   ├── load.ts                        # loadCatalog() aggregator, validates uniqueness + integrity
    │   │   └── data/
    │   │       ├── index.ts                   # imports each data module, re-exports flat array
    │   │       ├── languages.ts               # typescript, python, go
    │   │       ├── runtimes.ts                # node, bun
    │   │       ├── frontend.ts                # react, vue, svelte, next
    │   │       ├── build-tools.ts             # vite
    │   │       ├── backend.ts                 # fastapi, express, nestjs, django
    │   │       ├── datastores.ts              # postgres, mysql, mongodb, redis (drop-as-service)
    │   │       ├── queues.ts                  # rabbitmq, redis-streams (drop-as-service)
    │   │       ├── auth.ts                    # auth-js, clerk
    │   │       └── entry-points.ts            # http-route, scheduled-job, queue-consumer, main
    │   └── tests/
    │       ├── types.test.ts
    │       ├── catalog.test.ts
    │       ├── load.test.ts
    │       └── data.test.ts                   # invariants: unique ids, valid file rules, etc.
    │
    ├── patterns/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── tsup.config.ts
    │   ├── vitest.config.ts
    │   ├── README.md
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── types.ts                       # PatternSchema, SpecFragmentSchema
    │   │   ├── instantiate.ts                 # instantiatePattern(pattern, dropPoint, idGen) → SpecFragment
    │   │   ├── load.ts                        # loadPatterns()
    │   │   └── data/
    │   │       ├── index.ts
    │   │       ├── rest-api-with-db.ts
    │   │       ├── frontend-backend-db.ts
    │   │       ├── worker-queue.ts
    │   │       ├── cached-api.ts
    │   │       └── microservices-skeleton.ts
    │   └── tests/
    │       ├── types.test.ts
    │       ├── instantiate.test.ts
    │       ├── data.test.ts
    │       └── golden-instantiate.test.ts     # full pattern → valid spec via @architext/schema
    │
    └── files-engine/
        ├── package.json
        ├── tsconfig.json
        ├── tsup.config.ts
        ├── vitest.config.ts
        ├── README.md
        ├── src/
        │   ├── index.ts
        │   ├── types.ts                       # FileTree
        │   ├── apply-when.ts                  # filter file rules by `when` clauses
        │   ├── always-files.ts                # README, architext-spec.json, .gitignore
        │   └── compute.ts                     # computeFileTree(spec, catalog): FileTree
        └── tests/
            ├── apply-when.test.ts
            ├── always-files.test.ts
            ├── compute.test.ts
            ├── determinism.test.ts
            └── snapshot/
                ├── frontend-backend-db.snap.json
                └── microservices.snap.json
```

**Why this split:** Each package has a single responsibility — catalog is authoring, patterns is composite drops, files-engine is a pure rules function. Within each, `types.ts` defines schemas, `data/` holds the authored content, and the top-level files (`load.ts`, `compute.ts`) are the public surface. Test files mirror src files 1:1.

**Cross-package imports:** Catalog and patterns each take a `workspace:*` dep on `@architext/schema`. Files-engine takes deps on both schema and catalog. No package imports patterns (patterns is web-only at runtime).

**Header convention reminder:** Every `.ts` file under `src/` gets a JSDoc header with `@module`, `Concepts:`, `Spec:`, `Depends on:`, `Consumed by:` lines. Test files do not need headers.

---

## Task 1: Catalog package skeleton

**Files:**
- Create: `packages/catalog/package.json`
- Create: `packages/catalog/tsconfig.json`
- Create: `packages/catalog/tsup.config.ts`
- Create: `packages/catalog/vitest.config.ts`
- Create: `packages/catalog/README.md`
- Create: `packages/catalog/src/index.ts`

- [ ] **Step 1: Write `packages/catalog/package.json`**

```json
{
  "name": "@architext/catalog",
  "version": "0.1.0",
  "description": "Component, framework, and library catalog for Architext",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
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
    "@architext/schema": "workspace:*",
    "zod": "^3.23.8"
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

- [ ] **Step 2: Write `packages/catalog/tsconfig.json`**

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

- [ ] **Step 3: Write `packages/catalog/tsup.config.ts`**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
```

- [ ] **Step 4: Write `packages/catalog/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 5: Write `packages/catalog/README.md`**

```markdown
# @architext/catalog

Component, framework, and library catalog for [Architext](../../README.md).

This package is **data, not code**: each entry describes a draggable item in the canvas palette and the file contributions it makes when present in a service. The Zod-validated schema lives in `src/types.ts`; the concrete entries live in `src/data/`.

## Usage

```typescript
import { loadCatalog } from "@architext/catalog";

const catalog = loadCatalog();
const react = catalog.byId("react");
const frameworks = catalog.byCategory("framework");
```

## Adding entries

Add a TS module under `src/data/`, export an array of validated entries, then list it in `src/data/index.ts`. The build will fail if any entry is malformed.
```

- [ ] **Step 6: Write `packages/catalog/src/index.ts`**

```typescript
/**
 * @module @architext/catalog/index
 * Concepts: [[CatalogPublicAPI]], [[Barrel]]
 * Spec: §7 Component Catalog — public surface
 * Depends on: [[types]], [[catalog]], [[load]]
 * Consumed by: [[@architext/web]] (palette rail), [[@architext/files-engine]] (rule lookup), [[@architext/cli]] (prompt enrichment)
 */

export {};
```

- [ ] **Step 7: Install + typecheck + commit**

```bash
pnpm install
pnpm --filter @architext/catalog run typecheck
git add packages/catalog package.json pnpm-lock.yaml
git commit -m "chore(catalog): scaffold @architext/catalog package"
```

---

## Task 2: Catalog schema types (`CatalogEntry`, `FileRule`)

**Files:**
- Create: `packages/catalog/src/types.ts`
- Create: `packages/catalog/tests/types.test.ts`
- Modify: `packages/catalog/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/catalog/tests/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { CatalogEntrySchema, FileRuleSchema } from "../src/types";

describe("FileRuleSchema", () => {
  it("accepts a path-only rule", () => {
    expect(FileRuleSchema.safeParse({ path: "src/main.ts" }).success).toBe(true);
  });

  it("accepts a rule with `when` clauses", () => {
    const rule = {
      path: "src/main.tsx",
      when: { serviceKind: ["frontend-app"], requires: ["typescript"], excludes: ["javascript"] },
    };
    expect(FileRuleSchema.safeParse(rule).success).toBe(true);
  });

  it("rejects empty path", () => {
    expect(FileRuleSchema.safeParse({ path: "" }).success).toBe(false);
  });

  it("rejects unknown serviceKind in `when`", () => {
    expect(
      FileRuleSchema.safeParse({ path: "x", when: { serviceKind: ["weird-kind"] } }).success
    ).toBe(false);
  });
});

describe("CatalogEntrySchema (component variant)", () => {
  const minimalComponent = {
    id: "react",
    category: "library" as const,
    name: "React",
    description: "Component-based UI library",
    tags: ["frontend", "ui"],
    dropsAs: "component" as const,
    compatibleServiceKinds: ["frontend-app"],
  };

  it("accepts the minimal component entry", () => {
    expect(CatalogEntrySchema.safeParse(minimalComponent).success).toBe(true);
  });

  it("accepts optional fields (files, defaults, iconUrl)", () => {
    const full = {
      ...minimalComponent,
      files: [{ path: "src/main.tsx" }],
      defaultVersion: "^18.3.0",
      defaultConfig: { strict: true },
      iconUrl: "https://example.com/react.svg",
    };
    expect(CatalogEntrySchema.safeParse(full).success).toBe(true);
  });

  it("rejects component entry that includes serviceKindIfService", () => {
    expect(
      CatalogEntrySchema.safeParse({
        ...minimalComponent,
        serviceKindIfService: "database",
      }).success
    ).toBe(false);
  });

  it("rejects component entry without compatibleServiceKinds", () => {
    const bad = { ...minimalComponent } as Record<string, unknown>;
    delete bad.compatibleServiceKinds;
    expect(CatalogEntrySchema.safeParse(bad).success).toBe(false);
  });
});

describe("CatalogEntrySchema (service variant)", () => {
  const minimalService = {
    id: "postgres",
    category: "datastore" as const,
    name: "PostgreSQL",
    description: "Relational SQL database",
    tags: ["database", "sql"],
    dropsAs: "service" as const,
    serviceKindIfService: "database" as const,
  };

  it("accepts the minimal service entry", () => {
    expect(CatalogEntrySchema.safeParse(minimalService).success).toBe(true);
  });

  it("rejects service entry that includes compatibleServiceKinds", () => {
    expect(
      CatalogEntrySchema.safeParse({
        ...minimalService,
        compatibleServiceKinds: ["database"],
      }).success
    ).toBe(false);
  });

  it("rejects service entry without serviceKindIfService", () => {
    const bad = { ...minimalService } as Record<string, unknown>;
    delete bad.serviceKindIfService;
    expect(CatalogEntrySchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown dropsAs", () => {
    expect(
      CatalogEntrySchema.safeParse({ ...minimalService, dropsAs: "weird" }).success
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `src/types.ts`**

```typescript
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
```

- [ ] **Step 3: Re-export from `index.ts`**

```typescript
/**
 * @module @architext/catalog/index
 * Concepts: [[CatalogPublicAPI]], [[Barrel]]
 * Spec: §7 Component Catalog — public surface
 * Depends on: [[types]], [[catalog]], [[load]]
 * Consumed by: [[@architext/web]] (palette rail), [[@architext/files-engine]] (rule lookup), [[@architext/cli]] (prompt enrichment)
 */

export * from "./types";
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm --filter @architext/catalog test
```
Expected: all 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/catalog/src/types.ts packages/catalog/src/index.ts packages/catalog/tests/types.test.ts
git commit -m "feat(catalog): add CatalogEntry and FileRule schemas"
```

---

## Task 3: Catalog helpers (`Catalog`, `byId`, `byCategory`, `byCompatibleServiceKind`)

**Files:**
- Create: `packages/catalog/src/catalog.ts`
- Create: `packages/catalog/tests/catalog.test.ts`
- Modify: `packages/catalog/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/catalog/tests/catalog.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { makeCatalog } from "../src/catalog";
import type { CatalogEntry } from "../src/types";

const entries: CatalogEntry[] = [
  {
    id: "react",
    category: "library",
    name: "React",
    description: "UI lib",
    tags: ["frontend"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
  },
  {
    id: "fastapi",
    category: "framework",
    name: "FastAPI",
    description: "Python API framework",
    tags: ["backend"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
  },
  {
    id: "postgres",
    category: "datastore",
    name: "PostgreSQL",
    description: "SQL db",
    tags: ["database"],
    dropsAs: "service",
    serviceKindIfService: "database",
  },
];

describe("makeCatalog", () => {
  it("returns an immutable view object", () => {
    const cat = makeCatalog(entries);
    expect(() => {
      // @ts-expect-error mutation should fail at runtime via Object.freeze
      cat.entries.push({} as CatalogEntry);
    }).toThrow();
  });

  it("byId looks up an entry", () => {
    const cat = makeCatalog(entries);
    expect(cat.byId("react")?.name).toBe("React");
    expect(cat.byId("missing")).toBeUndefined();
  });

  it("byCategory filters by category", () => {
    const cat = makeCatalog(entries);
    expect(cat.byCategory("library").map((e) => e.id)).toEqual(["react"]);
    expect(cat.byCategory("datastore").map((e) => e.id)).toEqual(["postgres"]);
    expect(cat.byCategory("language")).toEqual([]);
  });

  it("byCompatibleServiceKind returns components droppable into a service kind", () => {
    const cat = makeCatalog(entries);
    expect(cat.byCompatibleServiceKind("frontend-app").map((e) => e.id)).toEqual(["react"]);
    expect(cat.byCompatibleServiceKind("backend-service").map((e) => e.id)).toEqual(["fastapi"]);
  });

  it("byCompatibleServiceKind excludes service-creating tokens", () => {
    const cat = makeCatalog(entries);
    expect(cat.byCompatibleServiceKind("database")).toEqual([]);
  });

  it("byKindIfService returns service-creating tokens for a kind", () => {
    const cat = makeCatalog(entries);
    expect(cat.byKindIfService("database").map((e) => e.id)).toEqual(["postgres"]);
    expect(cat.byKindIfService("frontend-app")).toEqual([]);
  });

  it("rejects entries with duplicate ids on construction", () => {
    expect(() =>
      makeCatalog([entries[0]!, { ...entries[0]!, name: "duplicate" }])
    ).toThrow(/duplicate catalog id: react/);
  });
});
```

- [ ] **Step 2: Implement `src/catalog.ts`**

```typescript
/**
 * @module @architext/catalog/catalog
 * Concepts: [[Catalog]], [[LookupTable]], [[Immutable]]
 * Spec: §7.1 Catalog entry schema — usage shape consumed by web palette and files-engine
 * Depends on: [[@architext/schema]] (ComponentCategory, ServiceKind), [[types]] (CatalogEntry)
 * Consumed by: [[load]] (returns this), [[@architext/web]] (palette filtering), [[@architext/files-engine]] (lookup file rules)
 */

import type { ComponentCategory, ServiceKind } from "@architext/schema";
import type { CatalogEntry } from "./types";

export interface Catalog {
  readonly entries: readonly CatalogEntry[];
  byId(id: string): CatalogEntry | undefined;
  byCategory(category: ComponentCategory): readonly CatalogEntry[];
  byCompatibleServiceKind(kind: ServiceKind): readonly CatalogEntry[];
  byKindIfService(kind: ServiceKind): readonly CatalogEntry[];
}

export function makeCatalog(entries: readonly CatalogEntry[]): Catalog {
  const byIdMap = new Map<string, CatalogEntry>();
  for (const e of entries) {
    if (byIdMap.has(e.id)) {
      throw new Error(`duplicate catalog id: ${e.id}`);
    }
    byIdMap.set(e.id, e);
  }

  const frozen = Object.freeze([...entries]) as readonly CatalogEntry[];

  return Object.freeze({
    entries: frozen,
    byId: (id) => byIdMap.get(id),
    byCategory: (category) => frozen.filter((e) => e.category === category),
    byCompatibleServiceKind: (kind) =>
      frozen.filter(
        (e) => e.dropsAs === "component" && e.compatibleServiceKinds.includes(kind)
      ),
    byKindIfService: (kind) =>
      frozen.filter((e) => e.dropsAs === "service" && e.serviceKindIfService === kind),
  });
}
```

- [ ] **Step 3: Re-export from `index.ts`**

```typescript
/**
 * @module @architext/catalog/index
 * Concepts: [[CatalogPublicAPI]], [[Barrel]]
 * Spec: §7 Component Catalog — public surface
 * Depends on: [[types]], [[catalog]], [[load]]
 * Consumed by: [[@architext/web]] (palette rail), [[@architext/files-engine]] (rule lookup), [[@architext/cli]] (prompt enrichment)
 */

export * from "./types";
export * from "./catalog";
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @architext/catalog test
```
Expected: all tests pass (existing + 8 new).

- [ ] **Step 5: Commit**

```bash
git add packages/catalog/src/catalog.ts packages/catalog/src/index.ts packages/catalog/tests/catalog.test.ts
git commit -m "feat(catalog): add Catalog type with byId/byCategory/byCompatibleServiceKind helpers"
```

---

## Task 4: Languages and runtimes data

**Files:**
- Create: `packages/catalog/src/data/languages.ts`
- Create: `packages/catalog/src/data/runtimes.ts`

- [ ] **Step 1: Write `src/data/languages.ts`**

```typescript
/**
 * @module @architext/catalog/data/languages
 * Concepts: [[CatalogData]], [[Language]]
 * Spec: §7.2 v1 catalog scope — Languages: TypeScript, Python, Go
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]] (aggregator)
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "typescript",
    category: "language",
    name: "TypeScript",
    description: "Typed superset of JavaScript",
    tags: ["language", "typed", "javascript"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service", "worker"],
    files: [{ path: "tsconfig.json" }],
  },
  {
    id: "python",
    category: "language",
    name: "Python",
    description: "High-level interpreted language",
    tags: ["language", "interpreted"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service", "worker"],
    files: [{ path: "pyproject.toml" }, { path: ".python-version" }],
  },
  {
    id: "go",
    category: "language",
    name: "Go",
    description: "Compiled, statically typed language from Google",
    tags: ["language", "compiled", "static"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service", "worker"],
    files: [{ path: "go.mod" }, { path: "go.sum" }],
  },
] as const;

export const languages: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
```

- [ ] **Step 2: Write `src/data/runtimes.ts`**

```typescript
/**
 * @module @architext/catalog/data/runtimes
 * Concepts: [[CatalogData]], [[Runtime]]
 * Spec: §7.2 v1 catalog scope — Runtimes: Node, Bun
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]] (aggregator)
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "node",
    category: "runtime",
    name: "Node.js",
    description: "JavaScript runtime built on V8",
    tags: ["runtime", "javascript"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service", "worker"],
    files: [{ path: "package.json" }, { path: ".nvmrc" }],
  },
  {
    id: "bun",
    category: "runtime",
    name: "Bun",
    description: "Fast all-in-one JavaScript runtime",
    tags: ["runtime", "javascript", "fast"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service", "worker"],
    files: [{ path: "package.json" }, { path: "bunfig.toml" }],
  },
] as const;

export const runtimes: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
```

- [ ] **Step 3: Smoke test (no separate test file yet — `data.test.ts` covers all entries together later)**

```bash
pnpm --filter @architext/catalog run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/catalog/src/data/languages.ts packages/catalog/src/data/runtimes.ts
git commit -m "feat(catalog): add languages (TypeScript, Python, Go) and runtimes (Node, Bun)"
```

---

## Task 5: Frontend frameworks, libraries, and build tools

**Files:**
- Create: `packages/catalog/src/data/frontend.ts`
- Create: `packages/catalog/src/data/build-tools.ts`

- [ ] **Step 1: Write `src/data/frontend.ts`**

```typescript
/**
 * @module @architext/catalog/data/frontend
 * Concepts: [[CatalogData]], [[FrontendFramework]], [[Library]]
 * Spec: §7.2 v1 catalog scope — Frontend frameworks: React, Vue, Svelte, Next.js
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "react",
    category: "library",
    name: "React",
    description: "Component-based UI library",
    tags: ["frontend", "ui", "spa"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [
      { path: "src/main.tsx", when: { requires: ["typescript"] } },
      { path: "src/main.jsx", when: { excludes: ["typescript"] } },
      { path: "src/App.tsx", when: { requires: ["typescript"] } },
      { path: "src/App.jsx", when: { excludes: ["typescript"] } },
      { path: "index.html" },
    ],
    defaultVersion: "^18.3.0",
  },
  {
    id: "vue",
    category: "library",
    name: "Vue",
    description: "Progressive framework for building UIs",
    tags: ["frontend", "ui", "spa"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [
      { path: "src/main.ts", when: { requires: ["typescript"] } },
      { path: "src/main.js", when: { excludes: ["typescript"] } },
      { path: "src/App.vue" },
      { path: "index.html" },
    ],
    defaultVersion: "^3.4.0",
  },
  {
    id: "svelte",
    category: "library",
    name: "Svelte",
    description: "Cybernetically enhanced web apps",
    tags: ["frontend", "ui", "compiled"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [
      { path: "src/main.ts", when: { requires: ["typescript"] } },
      { path: "src/main.js", when: { excludes: ["typescript"] } },
      { path: "src/App.svelte" },
      { path: "index.html" },
      { path: "svelte.config.js" },
    ],
    defaultVersion: "^4.2.0",
  },
  {
    id: "next",
    category: "framework",
    name: "Next.js",
    description: "React framework for production",
    tags: ["frontend", "fullstack", "ssr"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [
      { path: "next.config.js" },
      { path: "app/layout.tsx", when: { requires: ["typescript"] } },
      { path: "app/page.tsx", when: { requires: ["typescript"] } },
      { path: "app/layout.jsx", when: { excludes: ["typescript"] } },
      { path: "app/page.jsx", when: { excludes: ["typescript"] } },
    ],
    defaultVersion: "^14.0.0",
  },
] as const;

export const frontend: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
```

- [ ] **Step 2: Write `src/data/build-tools.ts`**

```typescript
/**
 * @module @architext/catalog/data/build-tools
 * Concepts: [[CatalogData]], [[BuildTool]]
 * Spec: §7.2 v1 catalog scope — Build tools: Vite
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "vite",
    category: "build-tool",
    name: "Vite",
    description: "Next-generation frontend tooling",
    tags: ["build-tool", "frontend", "fast"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [{ path: "vite.config.ts", when: { requires: ["typescript"] } }, { path: "vite.config.js", when: { excludes: ["typescript"] } }],
    defaultVersion: "^5.0.0",
  },
] as const;

export const buildTools: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @architext/catalog run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/catalog/src/data/frontend.ts packages/catalog/src/data/build-tools.ts
git commit -m "feat(catalog): add frontend frameworks and Vite build tool"
```

---

## Task 6: Backend frameworks

**Files:**
- Create: `packages/catalog/src/data/backend.ts`

- [ ] **Step 1: Write `src/data/backend.ts`**

```typescript
/**
 * @module @architext/catalog/data/backend
 * Concepts: [[CatalogData]], [[BackendFramework]]
 * Spec: §7.2 v1 catalog scope — Backend frameworks: FastAPI, Express, NestJS, Django
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "fastapi",
    category: "framework",
    name: "FastAPI",
    description: "Modern, fast Python web framework for APIs",
    tags: ["backend", "api", "python", "async"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
    files: [{ path: "main.py" }, { path: "requirements.txt" }],
  },
  {
    id: "express",
    category: "framework",
    name: "Express",
    description: "Minimal Node.js web framework",
    tags: ["backend", "api", "node"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
    files: [
      { path: "src/index.ts", when: { requires: ["typescript"] } },
      { path: "src/index.js", when: { excludes: ["typescript"] } },
    ],
    defaultVersion: "^4.19.0",
  },
  {
    id: "nestjs",
    category: "framework",
    name: "NestJS",
    description: "Progressive Node.js framework with DI and decorators",
    tags: ["backend", "api", "node", "typescript"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
    files: [
      { path: "src/main.ts" },
      { path: "src/app.module.ts" },
      { path: "src/app.controller.ts" },
      { path: "nest-cli.json" },
    ],
    defaultVersion: "^10.0.0",
  },
  {
    id: "django",
    category: "framework",
    name: "Django",
    description: "Batteries-included Python web framework",
    tags: ["backend", "api", "python", "orm"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
    files: [{ path: "manage.py" }, { path: "requirements.txt" }],
  },
] as const;

export const backend: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @architext/catalog run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/catalog/src/data/backend.ts
git commit -m "feat(catalog): add backend frameworks (FastAPI, Express, NestJS, Django)"
```

---

## Task 7: Datastores and queues (drop-as-service)

**Files:**
- Create: `packages/catalog/src/data/datastores.ts`
- Create: `packages/catalog/src/data/queues.ts`

- [ ] **Step 1: Write `src/data/datastores.ts`**

```typescript
/**
 * @module @architext/catalog/data/datastores
 * Concepts: [[CatalogData]], [[Datastore]], [[ServiceCreatingToken]]
 * Spec: §7.2 v1 catalog scope — Datastores drop as Service: PostgreSQL, MySQL, MongoDB, Redis
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "postgres",
    category: "datastore",
    name: "PostgreSQL",
    description: "Relational SQL database",
    tags: ["database", "sql", "relational"],
    dropsAs: "service",
    serviceKindIfService: "database",
    files: [{ path: "schema.sql" }],
    defaultConfig: { port: 5432 },
  },
  {
    id: "mysql",
    category: "datastore",
    name: "MySQL",
    description: "Widely-used relational SQL database",
    tags: ["database", "sql", "relational"],
    dropsAs: "service",
    serviceKindIfService: "database",
    files: [{ path: "schema.sql" }],
    defaultConfig: { port: 3306 },
  },
  {
    id: "mongodb",
    category: "datastore",
    name: "MongoDB",
    description: "Document-oriented NoSQL database",
    tags: ["database", "nosql", "document"],
    dropsAs: "service",
    serviceKindIfService: "database",
    files: [{ path: "schema.json" }],
    defaultConfig: { port: 27017 },
  },
  {
    id: "redis",
    category: "datastore",
    name: "Redis",
    description: "In-memory key-value store",
    tags: ["cache", "kv"],
    dropsAs: "service",
    serviceKindIfService: "cache",
    defaultConfig: { port: 6379 },
  },
] as const;

export const datastores: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
```

- [ ] **Step 2: Write `src/data/queues.ts`**

```typescript
/**
 * @module @architext/catalog/data/queues
 * Concepts: [[CatalogData]], [[Queue]], [[ServiceCreatingToken]]
 * Spec: §7.2 v1 catalog scope — Queues drop as Service: RabbitMQ, Redis Streams
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "rabbitmq",
    category: "datastore",
    name: "RabbitMQ",
    description: "AMQP message broker",
    tags: ["queue", "broker", "amqp"],
    dropsAs: "service",
    serviceKindIfService: "queue",
    defaultConfig: { port: 5672 },
  },
  {
    id: "redis-streams",
    category: "datastore",
    name: "Redis Streams",
    description: "Durable log/queue using Redis",
    tags: ["queue", "broker", "redis"],
    dropsAs: "service",
    serviceKindIfService: "queue",
    defaultConfig: { port: 6379 },
  },
] as const;

export const queues: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @architext/catalog run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/catalog/src/data/datastores.ts packages/catalog/src/data/queues.ts
git commit -m "feat(catalog): add datastores and queues (drop-as-service)"
```

---

## Task 8: Auth providers and entry points

**Files:**
- Create: `packages/catalog/src/data/auth.ts`
- Create: `packages/catalog/src/data/entry-points.ts`

- [ ] **Step 1: Write `src/data/auth.ts`**

```typescript
/**
 * @module @architext/catalog/data/auth
 * Concepts: [[CatalogData]], [[Auth]]
 * Spec: §7.2 v1 catalog scope — Auth: Auth.js, Clerk
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "auth-js",
    category: "auth",
    name: "Auth.js",
    description: "Open-source authentication for the web",
    tags: ["auth", "session"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service"],
    files: [
      { path: "auth.config.ts", when: { requires: ["typescript"] } },
      { path: "auth.config.js", when: { excludes: ["typescript"] } },
    ],
  },
  {
    id: "clerk",
    category: "auth",
    name: "Clerk",
    description: "Hosted authentication and user management",
    tags: ["auth", "saas", "session"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service"],
  },
] as const;

export const auth: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
```

- [ ] **Step 2: Write `src/data/entry-points.ts`**

```typescript
/**
 * @module @architext/catalog/data/entry-points
 * Concepts: [[CatalogData]], [[EntryPoint]]
 * Spec: §7.2 v1 catalog scope — Entry points: HTTP route, Scheduled job, Queue consumer, main()
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "entry-http-route",
    category: "entry-point",
    name: "HTTP route",
    description: "User-defined HTTP request handler",
    tags: ["entry-point", "http"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service"],
  },
  {
    id: "entry-scheduled-job",
    category: "entry-point",
    name: "Scheduled job",
    description: "User-defined recurring job",
    tags: ["entry-point", "cron", "scheduled"],
    dropsAs: "component",
    compatibleServiceKinds: ["worker", "backend-service"],
  },
  {
    id: "entry-queue-consumer",
    category: "entry-point",
    name: "Queue consumer",
    description: "User-defined message handler",
    tags: ["entry-point", "queue"],
    dropsAs: "component",
    compatibleServiceKinds: ["worker"],
  },
  {
    id: "entry-main",
    category: "entry-point",
    name: "main()",
    description: "User-defined start function",
    tags: ["entry-point", "main"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service", "worker"],
  },
] as const;

export const entryPoints: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @architext/catalog run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/catalog/src/data/auth.ts packages/catalog/src/data/entry-points.ts
git commit -m "feat(catalog): add auth providers and entry points"
```

---

## Task 9: Catalog data aggregator and `loadCatalog()`

**Files:**
- Create: `packages/catalog/src/data/index.ts`
- Create: `packages/catalog/src/load.ts`
- Create: `packages/catalog/tests/load.test.ts`
- Modify: `packages/catalog/src/index.ts`

- [ ] **Step 1: Write `src/data/index.ts`**

```typescript
/**
 * @module @architext/catalog/data/index
 * Concepts: [[CatalogData]], [[Aggregator]]
 * Spec: §7.2 v1 catalog scope — flat list of every authored entry
 * Depends on: each [[data/*]] module
 * Consumed by: [[load]]
 */

import type { CatalogEntry } from "../types";
import { languages } from "./languages";
import { runtimes } from "./runtimes";
import { frontend } from "./frontend";
import { buildTools } from "./build-tools";
import { backend } from "./backend";
import { datastores } from "./datastores";
import { queues } from "./queues";
import { auth } from "./auth";
import { entryPoints } from "./entry-points";

export const allEntries: readonly CatalogEntry[] = Object.freeze([
  ...languages,
  ...runtimes,
  ...frontend,
  ...buildTools,
  ...backend,
  ...datastores,
  ...queues,
  ...auth,
  ...entryPoints,
]);
```

- [ ] **Step 2: Write `src/load.ts`**

```typescript
/**
 * @module @architext/catalog/load
 * Concepts: [[Catalog]], [[Loader]]
 * Spec: §7.1 Catalog entry schema — single entry point for consumers
 * Depends on: [[catalog]] (makeCatalog), [[data/index]] (allEntries)
 * Consumed by: [[index]] (re-export), [[@architext/web]] (palette init), [[@architext/files-engine]]
 */

import { makeCatalog, type Catalog } from "./catalog";
import { allEntries } from "./data";

let cached: Catalog | undefined;

export function loadCatalog(): Catalog {
  if (cached === undefined) {
    cached = makeCatalog(allEntries);
  }
  return cached;
}
```

- [ ] **Step 3: Write `tests/load.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { loadCatalog } from "../src/load";

describe("loadCatalog", () => {
  it("returns a Catalog with at least 22 entries (v1 scope)", () => {
    const cat = loadCatalog();
    expect(cat.entries.length).toBeGreaterThanOrEqual(22);
  });

  it("returns the same instance across calls (memoized)", () => {
    expect(loadCatalog()).toBe(loadCatalog());
  });

  it("has react in the library category", () => {
    const cat = loadCatalog();
    expect(cat.byId("react")?.category).toBe("library");
  });

  it("has postgres droppable as a database service", () => {
    const cat = loadCatalog();
    expect(cat.byKindIfService("database").map((e) => e.id)).toContain("postgres");
  });
});
```

- [ ] **Step 4: Re-export from `index.ts`**

```typescript
/**
 * @module @architext/catalog/index
 * Concepts: [[CatalogPublicAPI]], [[Barrel]]
 * Spec: §7 Component Catalog — public surface
 * Depends on: [[types]], [[catalog]], [[load]]
 * Consumed by: [[@architext/web]] (palette rail), [[@architext/files-engine]] (rule lookup), [[@architext/cli]] (prompt enrichment)
 */

export * from "./types";
export * from "./catalog";
export * from "./load";
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @architext/catalog test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/catalog/src/data/index.ts packages/catalog/src/load.ts packages/catalog/src/index.ts packages/catalog/tests/load.test.ts
git commit -m "feat(catalog): add loadCatalog() aggregator"
```

---

## Task 10: Catalog data invariants test + final build

**Files:**
- Create: `packages/catalog/tests/data.test.ts`

- [ ] **Step 1: Write the invariants test**

`packages/catalog/tests/data.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadCatalog } from "../src/load";

describe("Catalog invariants (v1 data)", () => {
  const cat = loadCatalog();

  it("has unique ids across every entry", () => {
    const ids = cat.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a non-empty description and at least one tag", () => {
    for (const e of cat.entries) {
      expect(e.description.length).toBeGreaterThan(0);
      expect(e.tags.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("file rules' `requires`/`excludes` reference real catalog ids", () => {
    const ids = new Set(cat.entries.map((e) => e.id));
    for (const e of cat.entries) {
      for (const f of e.files ?? []) {
        for (const req of f.when?.requires ?? []) {
          expect(ids).toContain(req);
        }
        for (const exc of f.when?.excludes ?? []) {
          expect(ids).toContain(exc);
        }
      }
    }
  });

  it("covers every documented v1 category", () => {
    const cats = new Set(cat.entries.map((e) => e.category));
    for (const c of [
      "language",
      "runtime",
      "framework",
      "library",
      "build-tool",
      "datastore",
      "auth",
      "entry-point",
    ]) {
      expect(cats).toContain(c);
    }
  });

  it("has at least one drop-as-service entry per kind: database, cache, queue", () => {
    expect(cat.byKindIfService("database").length).toBeGreaterThanOrEqual(1);
    expect(cat.byKindIfService("cache").length).toBeGreaterThanOrEqual(1);
    expect(cat.byKindIfService("queue").length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @architext/catalog test
```
Expected: all tests pass.

- [ ] **Step 3: Build the package**

```bash
pnpm --filter @architext/catalog build
```
Expected: produces `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`. No warnings.

- [ ] **Step 4: Commit**

```bash
git add packages/catalog/tests/data.test.ts
git commit -m "test(catalog): add v1 data invariants suite"
```

---

## Task 11: Patterns package skeleton

**Files:**
- Create: `packages/patterns/package.json`
- Create: `packages/patterns/tsconfig.json`
- Create: `packages/patterns/tsup.config.ts`
- Create: `packages/patterns/vitest.config.ts`
- Create: `packages/patterns/README.md`
- Create: `packages/patterns/src/index.ts`

- [ ] **Step 1: Write `packages/patterns/package.json`**

```json
{
  "name": "@architext/patterns",
  "version": "0.1.0",
  "description": "Composite drop templates for Architext canvas",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
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
    "@architext/schema": "workspace:*",
    "zod": "^3.23.8"
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

- [ ] **Step 2: Write `packages/patterns/tsconfig.json`**

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

- [ ] **Step 3: Write `packages/patterns/tsup.config.ts`**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
```

- [ ] **Step 4: Write `packages/patterns/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 5: Write `packages/patterns/README.md`**

```markdown
# @architext/patterns

Composite drop templates for the [Architext](../../README.md) canvas.

A pattern is a pre-wired sub-spec dropped as a single unit (e.g., "REST API + DB" places a backend-service, a database, and an HTTP+SQL edge in one undo step). The schema lives in `src/types.ts`; the concrete patterns live in `src/data/`.

## Usage

```typescript
import { loadPatterns, instantiatePattern } from "@architext/patterns";

const all = loadPatterns();
const restApi = all.byId("rest-api-with-db");
const fragment = instantiatePattern(restApi, { x: 100, y: 100 });
```
```

- [ ] **Step 6: Write `packages/patterns/src/index.ts`**

```typescript
/**
 * @module @architext/patterns/index
 * Concepts: [[PatternsPublicAPI]], [[Barrel]]
 * Spec: §7.4 Patterns library — public surface
 * Depends on: [[types]], [[instantiate]], [[load]]
 * Consumed by: [[@architext/web]] (palette Architecture category)
 */

export {};
```

- [ ] **Step 7: Install + typecheck + commit**

```bash
pnpm install
pnpm --filter @architext/patterns run typecheck
git add packages/patterns package.json pnpm-lock.yaml
git commit -m "chore(patterns): scaffold @architext/patterns package"
```

---

## Task 12: Pattern and SpecFragment schemas

**Files:**
- Create: `packages/patterns/src/types.ts`
- Create: `packages/patterns/tests/types.test.ts`
- Modify: `packages/patterns/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/patterns/tests/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { PatternSchema, SpecFragmentSchema } from "../src/types";

describe("SpecFragmentSchema", () => {
  it("accepts a fragment with services and edges (no groups)", () => {
    const fragment = {
      services: [{ name: "api", kind: "backend-service" }],
      edges: [],
    };
    expect(SpecFragmentSchema.safeParse(fragment).success).toBe(true);
  });

  it("accepts a fragment with all three arrays", () => {
    const fragment = {
      groups: [{ name: "Backend", kind: "backend" }],
      services: [{ name: "api", kind: "backend-service" }],
      edges: [{ from: "tmp-api", to: "tmp-db", protocol: "sql" }],
    };
    expect(SpecFragmentSchema.safeParse(fragment).success).toBe(true);
  });

  it("requires services and edges (groups optional)", () => {
    expect(SpecFragmentSchema.safeParse({ edges: [] }).success).toBe(false);
    expect(SpecFragmentSchema.safeParse({ services: [] }).success).toBe(false);
  });
});

describe("PatternSchema", () => {
  const minimal = {
    id: "rest-api-with-db",
    name: "REST API + DB",
    description: "A backend service connected to a database via SQL",
    fragment: {
      services: [{ name: "api", kind: "backend-service" }],
      edges: [],
    },
  };

  it("accepts the minimal pattern", () => {
    expect(PatternSchema.safeParse(minimal).success).toBe(true);
  });

  it("accepts iconUrl and preview", () => {
    expect(
      PatternSchema.safeParse({
        ...minimal,
        iconUrl: "https://example.com/icon.svg",
        preview: "<svg>...</svg>",
      }).success
    ).toBe(true);
  });

  it("rejects empty id, name, description", () => {
    expect(PatternSchema.safeParse({ ...minimal, id: "" }).success).toBe(false);
    expect(PatternSchema.safeParse({ ...minimal, name: "" }).success).toBe(false);
    expect(PatternSchema.safeParse({ ...minimal, description: "" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `src/types.ts`**

```typescript
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
```

- [ ] **Step 3: Re-export from `index.ts`**

```typescript
/**
 * @module @architext/patterns/index
 * Concepts: [[PatternsPublicAPI]], [[Barrel]]
 * Spec: §7.4 Patterns library — public surface
 * Depends on: [[types]], [[instantiate]], [[load]]
 * Consumed by: [[@architext/web]] (palette Architecture category)
 */

export * from "./types";
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @architext/patterns test
```
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/patterns/src/types.ts packages/patterns/src/index.ts packages/patterns/tests/types.test.ts
git commit -m "feat(patterns): add Pattern and SpecFragment schemas"
```

---

## Task 13: `instantiatePattern` (id remap, position offset)

**Files:**
- Create: `packages/patterns/src/instantiate.ts`
- Create: `packages/patterns/tests/instantiate.test.ts`
- Modify: `packages/patterns/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/patterns/tests/instantiate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { instantiatePattern } from "../src/instantiate";
import type { Pattern } from "../src/types";

const pattern: Pattern = {
  id: "rest-api-with-db",
  name: "REST API + DB",
  description: "A backend service connected to a database via SQL",
  fragment: {
    groups: [{ name: "Backend", kind: "backend", tmpId: "g1" }],
    services: [
      { name: "api", kind: "backend-service", tmpId: "api", tmpGroupId: "g1", offset: { x: 0, y: 0 } },
      { name: "db", kind: "database", tmpId: "db", tmpGroupId: "g1", offset: { x: 200, y: 50 } },
    ],
    edges: [{ from: "api", to: "db", protocol: "sql" }],
  },
};

describe("instantiatePattern", () => {
  it("returns groups, services, and edges with fresh ids", () => {
    let n = 0;
    const idGen = () => `id-${++n}`;
    const result = instantiatePattern(pattern, { x: 100, y: 100 }, idGen);

    expect(result.groups).toHaveLength(1);
    expect(result.services).toHaveLength(2);
    expect(result.edges).toHaveLength(1);

    // ids are the deterministic ones from idGen
    const ids = [
      ...result.groups.map((g) => g.id),
      ...result.services.map((s) => s.id),
      ...result.edges.map((e) => e.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^id-\d+$/);
    }
  });

  it("offsets service positions by drop point", () => {
    let n = 0;
    const result = instantiatePattern(pattern, { x: 100, y: 100 }, () => `id-${++n}`);
    const api = result.services.find((s) => s.name === "api")!;
    const db = result.services.find((s) => s.name === "db")!;
    expect(api.position).toEqual({ x: 100, y: 100 });
    expect(db.position).toEqual({ x: 300, y: 150 });
  });

  it("re-points service.groupId to the new group id", () => {
    let n = 0;
    const result = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);
    const groupId = result.groups[0]!.id;
    for (const s of result.services) {
      expect(s.groupId).toBe(groupId);
    }
  });

  it("re-points edge.from / edge.to to the new service ids", () => {
    let n = 0;
    const result = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);
    const apiId = result.services.find((s) => s.name === "api")!.id;
    const dbId = result.services.find((s) => s.name === "db")!.id;
    const edge = result.edges[0]!;
    expect(edge.from).toBe(apiId);
    expect(edge.to).toBe(dbId);
  });

  it("preserves edge protocol-specific fields", () => {
    const queuePattern: Pattern = {
      id: "p",
      name: "p",
      description: "p",
      fragment: {
        services: [
          { name: "p", kind: "backend-service", tmpId: "p" },
          { name: "q", kind: "queue", tmpId: "q" },
        ],
        edges: [{ from: "p", to: "q", protocol: "queue", topicName: "events" }],
      },
    };
    let n = 0;
    const result = instantiatePattern(queuePattern, { x: 0, y: 0 }, () => `id-${++n}`);
    const e = result.edges[0]!;
    expect(e.protocol).toBe("queue");
    if (e.protocol === "queue") {
      expect(e.topicName).toBe("events");
    }
  });

  it("throws when an edge tmpId reference doesn't match a service", () => {
    const broken: Pattern = {
      id: "p",
      name: "p",
      description: "p",
      fragment: {
        services: [{ name: "a", kind: "backend-service", tmpId: "a" }],
        edges: [{ from: "a", to: "ghost", protocol: "http" }],
      },
    };
    expect(() => instantiatePattern(broken, { x: 0, y: 0 }, () => "x")).toThrow(
      /unknown tmpId: ghost/
    );
  });
});
```

- [ ] **Step 2: Implement `src/instantiate.ts`**

```typescript
/**
 * @module @architext/patterns/instantiate
 * Concepts: [[InstantiatePattern]], [[IdRemap]], [[PositionOffset]]
 * Spec: §7.4 Patterns library — atomic insert: fresh ids, re-pointed refs, offset position
 * Depends on: [[@architext/schema]] (Group, Service, Edge), [[types]] (Pattern)
 * Consumed by: [[@architext/web]] (canvas drop handler)
 */

import type { Group, Service, Edge, Position } from "@architext/schema";
import type { Pattern } from "./types";

export interface InstantiatedFragment {
  groups: Group[];
  services: Service[];
  edges: Edge[];
}

export type IdGenerator = () => string;

export function instantiatePattern(
  pattern: Pattern,
  dropPoint: Position,
  idGen: IdGenerator
): InstantiatedFragment {
  const groupIdMap = new Map<string, string>();
  const serviceIdMap = new Map<string, string>();

  const groups: Group[] = (pattern.fragment.groups ?? []).map((g) => {
    const id = idGen();
    if (g.tmpId) groupIdMap.set(g.tmpId, id);
    return {
      id,
      name: g.name,
      kind: g.kind,
      serviceIds: [],
      position: { x: dropPoint.x, y: dropPoint.y },
      size: { width: 400, height: 300 },
      ...(g.network !== undefined ? { network: g.network } : {}),
    };
  });

  const services: Service[] = pattern.fragment.services.map((s) => {
    const id = idGen();
    if (s.tmpId) serviceIdMap.set(s.tmpId, id);
    const offset = s.offset ?? { x: 0, y: 0 };
    const groupId = s.tmpGroupId !== undefined ? groupIdMap.get(s.tmpGroupId) : undefined;
    if (s.tmpGroupId !== undefined && groupId === undefined) {
      throw new Error(`unknown tmpId: ${s.tmpGroupId}`);
    }
    return {
      id,
      name: s.name,
      kind: s.kind,
      ...(groupId !== undefined ? { groupId } : {}),
      position: { x: dropPoint.x + offset.x, y: dropPoint.y + offset.y },
      components: (s.components ?? []).map((c) => ({
        id: c.id,
        category: c.category,
        ...(c.version !== undefined ? { version: c.version } : {}),
        ...(c.config !== undefined ? { config: c.config } : {}),
      })),
    };
  });

  // Re-populate group.serviceIds based on tmpGroupId pointers
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]!;
    const tmpGid = pattern.fragment.groups?.[i]?.tmpId;
    if (tmpGid !== undefined) {
      g.serviceIds = pattern.fragment.services
        .filter((s) => s.tmpGroupId === tmpGid)
        .map((s) => serviceIdMap.get(s.tmpId!)!)
        .filter((x): x is string => x !== undefined);
    }
  }

  const edges: Edge[] = pattern.fragment.edges.map((e) => {
    const from = serviceIdMap.get(e.from);
    const to = serviceIdMap.get(e.to);
    if (from === undefined) throw new Error(`unknown tmpId: ${e.from}`);
    if (to === undefined) throw new Error(`unknown tmpId: ${e.to}`);
    const id = idGen();
    // Build the edge using the discriminant; spread protocol-specific fields.
    switch (e.protocol) {
      case "http":
        return { id, from, to, protocol: "http",
          ...(e.port !== undefined ? { port: e.port } : {}),
          ...(e.basePath !== undefined ? { basePath: e.basePath } : {}) };
      case "graphql":
        return { id, from, to, protocol: "graphql",
          ...(e.port !== undefined ? { port: e.port } : {}),
          ...(e.path !== undefined ? { path: e.path } : {}) };
      case "grpc":
        return { id, from, to, protocol: "grpc",
          ...(e.port !== undefined ? { port: e.port } : {}) };
      case "websocket":
        return { id, from, to, protocol: "websocket",
          ...(e.port !== undefined ? { port: e.port } : {}),
          ...(e.path !== undefined ? { path: e.path } : {}) };
      case "queue":
        return { id, from, to, protocol: "queue", topicName: e.topicName ?? "default",
          ...(e.broker !== undefined ? { broker: e.broker } : {}) };
      case "sql":
        return { id, from, to, protocol: "sql",
          ...(e.database !== undefined ? { database: e.database } : {}),
          ...(e.port !== undefined ? { port: e.port } : {}) };
      case "key-value":
        return { id, from, to, protocol: "key-value",
          ...(e.namespace !== undefined ? { namespace: e.namespace } : {}) };
      case "fs":
        return { id, from, to, protocol: "fs",
          ...(e.mountPath !== undefined ? { mountPath: e.mountPath } : {}) };
    }
  });

  return { groups, services, edges };
}
```

- [ ] **Step 3: Re-export from `index.ts`**

```typescript
/**
 * @module @architext/patterns/index
 * Concepts: [[PatternsPublicAPI]], [[Barrel]]
 * Spec: §7.4 Patterns library — public surface
 * Depends on: [[types]], [[instantiate]], [[load]]
 * Consumed by: [[@architext/web]] (palette Architecture category)
 */

export * from "./types";
export * from "./instantiate";
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @architext/patterns test
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/patterns/src/instantiate.ts packages/patterns/src/index.ts packages/patterns/tests/instantiate.test.ts
git commit -m "feat(patterns): add instantiatePattern with id remap and position offset"
```

---

## Task 14: Pattern data files (5 v1 patterns) + load + integration

**Files:**
- Create: `packages/patterns/src/data/rest-api-with-db.ts`
- Create: `packages/patterns/src/data/frontend-backend-db.ts`
- Create: `packages/patterns/src/data/worker-queue.ts`
- Create: `packages/patterns/src/data/cached-api.ts`
- Create: `packages/patterns/src/data/microservices-skeleton.ts`
- Create: `packages/patterns/src/data/index.ts`
- Create: `packages/patterns/src/load.ts`
- Create: `packages/patterns/tests/data.test.ts`
- Create: `packages/patterns/tests/golden-instantiate.test.ts`
- Modify: `packages/patterns/src/index.ts`

- [ ] **Step 1: Write `src/data/rest-api-with-db.ts`**

```typescript
/**
 * @module @architext/patterns/data/rest-api-with-db
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — REST API + DB
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const restApiWithDb: Pattern = PatternSchema.parse({
  id: "rest-api-with-db",
  name: "REST API + DB",
  description: "A backend service exposing HTTP, connected to a SQL database.",
  fragment: {
    services: [
      {
        name: "api",
        kind: "backend-service",
        tmpId: "api",
        offset: { x: 0, y: 0 },
        components: [
          { id: "node", category: "runtime" },
          { id: "express", category: "framework" },
        ],
      },
      {
        name: "db",
        kind: "database",
        tmpId: "db",
        offset: { x: 250, y: 50 },
        components: [{ id: "postgres", category: "datastore" }],
      },
    ],
    edges: [
      { from: "api", to: "db", protocol: "sql", port: 5432 },
    ],
  },
});
```

- [ ] **Step 2: Write `src/data/frontend-backend-db.ts`**

```typescript
/**
 * @module @architext/patterns/data/frontend-backend-db
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — Frontend + Backend + DB
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const frontendBackendDb: Pattern = PatternSchema.parse({
  id: "frontend-backend-db",
  name: "Frontend + Backend + DB",
  description: "A SPA frontend, a REST backend, and a SQL database.",
  fragment: {
    groups: [{ name: "Backend", kind: "backend", tmpId: "g-be" }],
    services: [
      {
        name: "web",
        kind: "frontend-app",
        tmpId: "web",
        offset: { x: 0, y: 0 },
        components: [
          { id: "typescript", category: "language" },
          { id: "react", category: "library" },
          { id: "vite", category: "build-tool" },
        ],
      },
      {
        name: "api",
        kind: "backend-service",
        tmpId: "api",
        tmpGroupId: "g-be",
        offset: { x: 350, y: 0 },
        components: [
          { id: "node", category: "runtime" },
          { id: "express", category: "framework" },
        ],
      },
      {
        name: "db",
        kind: "database",
        tmpId: "db",
        tmpGroupId: "g-be",
        offset: { x: 600, y: 100 },
        components: [{ id: "postgres", category: "datastore" }],
      },
    ],
    edges: [
      { from: "web", to: "api", protocol: "http", basePath: "/api" },
      { from: "api", to: "db", protocol: "sql", port: 5432 },
    ],
  },
});
```

- [ ] **Step 3: Write `src/data/worker-queue.ts`**

```typescript
/**
 * @module @architext/patterns/data/worker-queue
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — Worker + Queue
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const workerQueue: Pattern = PatternSchema.parse({
  id: "worker-queue",
  name: "Worker + Queue",
  description: "A producer service, a queue, and a worker consuming messages.",
  fragment: {
    services: [
      {
        name: "producer",
        kind: "backend-service",
        tmpId: "producer",
        offset: { x: 0, y: 0 },
        components: [
          { id: "node", category: "runtime" },
          { id: "express", category: "framework" },
        ],
      },
      {
        name: "broker",
        kind: "queue",
        tmpId: "broker",
        offset: { x: 250, y: 50 },
        components: [{ id: "rabbitmq", category: "datastore" }],
      },
      {
        name: "worker",
        kind: "worker",
        tmpId: "worker",
        offset: { x: 500, y: 0 },
        components: [
          { id: "python", category: "language" },
          { id: "entry-queue-consumer", category: "entry-point" },
        ],
      },
    ],
    edges: [
      { from: "producer", to: "broker", protocol: "queue", topicName: "events" },
      { from: "broker", to: "worker", protocol: "queue", topicName: "events" },
    ],
  },
});
```

- [ ] **Step 4: Write `src/data/cached-api.ts`**

```typescript
/**
 * @module @architext/patterns/data/cached-api
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — Cached API
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const cachedApi: Pattern = PatternSchema.parse({
  id: "cached-api",
  name: "Cached API",
  description: "A backend service backed by a database, fronted by a Redis cache.",
  fragment: {
    services: [
      {
        name: "api",
        kind: "backend-service",
        tmpId: "api",
        offset: { x: 200, y: 0 },
        components: [
          { id: "node", category: "runtime" },
          { id: "express", category: "framework" },
        ],
      },
      {
        name: "cache",
        kind: "cache",
        tmpId: "cache",
        offset: { x: 0, y: 100 },
        components: [{ id: "redis", category: "datastore" }],
      },
      {
        name: "db",
        kind: "database",
        tmpId: "db",
        offset: { x: 400, y: 100 },
        components: [{ id: "postgres", category: "datastore" }],
      },
    ],
    edges: [
      { from: "api", to: "cache", protocol: "key-value" },
      { from: "api", to: "db", protocol: "sql", port: 5432 },
    ],
  },
});
```

- [ ] **Step 5: Write `src/data/microservices-skeleton.ts`**

```typescript
/**
 * @module @architext/patterns/data/microservices-skeleton
 * Concepts: [[Pattern]], [[Architecture]]
 * Spec: §7.4 v1 patterns — Microservices skeleton
 * Depends on: [[types]] (PatternSchema)
 * Consumed by: [[data/index]]
 */

import { PatternSchema, type Pattern } from "../types";

export const microservicesSkeleton: Pattern = PatternSchema.parse({
  id: "microservices-skeleton",
  name: "Microservices skeleton",
  description: "Three backend services in a group, sharing a single database.",
  fragment: {
    groups: [{ name: "Services", kind: "backend", tmpId: "g-svc" }],
    services: [
      {
        name: "users",
        kind: "backend-service",
        tmpId: "users",
        tmpGroupId: "g-svc",
        offset: { x: 0, y: 0 },
        components: [{ id: "node", category: "runtime" }, { id: "express", category: "framework" }],
      },
      {
        name: "orders",
        kind: "backend-service",
        tmpId: "orders",
        tmpGroupId: "g-svc",
        offset: { x: 250, y: 0 },
        components: [{ id: "node", category: "runtime" }, { id: "express", category: "framework" }],
      },
      {
        name: "billing",
        kind: "backend-service",
        tmpId: "billing",
        tmpGroupId: "g-svc",
        offset: { x: 500, y: 0 },
        components: [{ id: "node", category: "runtime" }, { id: "express", category: "framework" }],
      },
      {
        name: "db",
        kind: "database",
        tmpId: "db",
        offset: { x: 250, y: 200 },
        components: [{ id: "postgres", category: "datastore" }],
      },
    ],
    edges: [
      { from: "users", to: "db", protocol: "sql" },
      { from: "orders", to: "db", protocol: "sql" },
      { from: "billing", to: "db", protocol: "sql" },
    ],
  },
});
```

- [ ] **Step 6: Write `src/data/index.ts`**

```typescript
/**
 * @module @architext/patterns/data/index
 * Concepts: [[PatternsData]], [[Aggregator]]
 * Spec: §7.4 v1 patterns library — flat list of every authored pattern
 * Depends on: each [[data/*]] module
 * Consumed by: [[load]]
 */

import type { Pattern } from "../types";
import { restApiWithDb } from "./rest-api-with-db";
import { frontendBackendDb } from "./frontend-backend-db";
import { workerQueue } from "./worker-queue";
import { cachedApi } from "./cached-api";
import { microservicesSkeleton } from "./microservices-skeleton";

export const allPatterns: readonly Pattern[] = Object.freeze([
  restApiWithDb,
  frontendBackendDb,
  workerQueue,
  cachedApi,
  microservicesSkeleton,
]);
```

- [ ] **Step 7: Write `src/load.ts`**

```typescript
/**
 * @module @architext/patterns/load
 * Concepts: [[PatternLibrary]], [[Loader]]
 * Spec: §7.4 Patterns library — single entry point
 * Depends on: [[data/index]] (allPatterns)
 * Consumed by: [[index]] (re-export), [[@architext/web]] (palette Architecture category)
 */

import type { Pattern } from "./types";
import { allPatterns } from "./data";

export interface PatternLibrary {
  readonly entries: readonly Pattern[];
  byId(id: string): Pattern | undefined;
}

let cached: PatternLibrary | undefined;

export function loadPatterns(): PatternLibrary {
  if (cached === undefined) {
    const byIdMap = new Map<string, Pattern>();
    for (const p of allPatterns) {
      if (byIdMap.has(p.id)) {
        throw new Error(`duplicate pattern id: ${p.id}`);
      }
      byIdMap.set(p.id, p);
    }
    cached = Object.freeze({
      entries: allPatterns,
      byId: (id) => byIdMap.get(id),
    });
  }
  return cached;
}
```

- [ ] **Step 8: Write `tests/data.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { loadPatterns } from "../src/load";

describe("Patterns invariants (v1 data)", () => {
  const lib = loadPatterns();

  it("contains at least 5 patterns (v1 scope)", () => {
    expect(lib.entries.length).toBeGreaterThanOrEqual(5);
  });

  it("has unique ids", () => {
    const ids = lib.entries.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has the v1-required pattern ids", () => {
    const ids = lib.entries.map((p) => p.id);
    expect(ids).toContain("rest-api-with-db");
    expect(ids).toContain("frontend-backend-db");
    expect(ids).toContain("worker-queue");
    expect(ids).toContain("cached-api");
    expect(ids).toContain("microservices-skeleton");
  });
});
```

- [ ] **Step 9: Write `tests/golden-instantiate.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { ArchitextSpecSchema, SCHEMA_VERSION } from "@architext/schema";
import { loadPatterns } from "../src/load";
import { instantiatePattern } from "../src/instantiate";

describe("Golden instantiate: every v1 pattern produces a valid spec when wrapped", () => {
  const lib = loadPatterns();

  for (const pattern of lib.entries) {
    it(`${pattern.id} → valid ArchitextSpec`, () => {
      let n = 0;
      const fragment = instantiatePattern(pattern, { x: 100, y: 100 }, () => `id-${++n}`);
      const spec = {
        schemaVersion: SCHEMA_VERSION,
        project: { name: "Test", slug: "test" },
        groups: fragment.groups,
        services: fragment.services,
        edges: fragment.edges,
      };
      const result = ArchitextSpecSchema.safeParse(spec);
      if (!result.success) {
        console.error(JSON.stringify(result.error.format(), null, 2));
      }
      expect(result.success).toBe(true);
    });
  }
});
```

- [ ] **Step 10: Re-export from `index.ts`**

```typescript
/**
 * @module @architext/patterns/index
 * Concepts: [[PatternsPublicAPI]], [[Barrel]]
 * Spec: §7.4 Patterns library — public surface
 * Depends on: [[types]], [[instantiate]], [[load]]
 * Consumed by: [[@architext/web]] (palette Architecture category)
 */

export * from "./types";
export * from "./instantiate";
export * from "./load";
```

- [ ] **Step 11: Run tests**

```bash
pnpm --filter @architext/patterns test
```
Expected: all tests pass — including 5 golden-instantiate tests proving each pattern wraps into a valid ArchitextSpec.

- [ ] **Step 12: Build the package**

```bash
pnpm --filter @architext/patterns build
```
Expected: clean build, no warnings.

- [ ] **Step 13: Commit**

```bash
git add packages/patterns/src/data packages/patterns/src/load.ts packages/patterns/src/index.ts packages/patterns/tests/data.test.ts packages/patterns/tests/golden-instantiate.test.ts
git commit -m "feat(patterns): add 5 v1 patterns and loadPatterns()"
```

---

## Task 15: Files-engine package skeleton

**Files:**
- Create: `packages/files-engine/package.json`
- Create: `packages/files-engine/tsconfig.json`
- Create: `packages/files-engine/tsup.config.ts`
- Create: `packages/files-engine/vitest.config.ts`
- Create: `packages/files-engine/README.md`
- Create: `packages/files-engine/src/index.ts`

- [ ] **Step 1: Write `packages/files-engine/package.json`**

```json
{
  "name": "@architext/files-engine",
  "version": "0.1.0",
  "description": "Deterministic file-tree predictor for Architext specs",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
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
    "@architext/schema": "workspace:*",
    "@architext/catalog": "workspace:*"
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

- [ ] **Step 2: Write `packages/files-engine/tsconfig.json`**

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

- [ ] **Step 3: Write `packages/files-engine/tsup.config.ts`**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
```

- [ ] **Step 4: Write `packages/files-engine/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 5: Write `packages/files-engine/README.md`**

```markdown
# @architext/files-engine

Deterministic file-tree predictor for [Architext](../../README.md) specs.

`computeFileTree(spec, catalog)` returns the set of files predicted to exist after the agent scaffolds the spec — paths only, no contents. Used by:

- The web app's Files tab (live preview as the user edits).
- The CLI's prompt-enrichment pass (told to the agent as ground truth: "produce at least these files").

The output is a soft contract with the agent: the measurable success criterion becomes "did the agent produce at least every predicted file?"

## Usage

```typescript
import { computeFileTree } from "@architext/files-engine";
import { loadCatalog } from "@architext/catalog";

const tree = computeFileTree(spec, loadCatalog());
console.log(tree.paths);              // ["api/main.py", "api/requirements.txt", ...]
console.log(tree.byService["api"]);   // ["api/main.py", ...]
```
```

- [ ] **Step 6: Write `packages/files-engine/src/index.ts`**

```typescript
/**
 * @module @architext/files-engine/index
 * Concepts: [[FilesEnginePublicAPI]], [[Barrel]]
 * Spec: §7.3 File-tree rules engine
 * Depends on: [[types]], [[compute]]
 * Consumed by: [[@architext/web]] (Files tab), [[@architext/cli]] (prompt enrichment)
 */

export {};
```

- [ ] **Step 7: Install + typecheck + commit**

```bash
pnpm install
pnpm --filter @architext/files-engine run typecheck
git add packages/files-engine package.json pnpm-lock.yaml
git commit -m "chore(files-engine): scaffold @architext/files-engine package"
```

---

## Task 16: `applyWhen` filter and types

**Files:**
- Create: `packages/files-engine/src/types.ts`
- Create: `packages/files-engine/src/apply-when.ts`
- Create: `packages/files-engine/tests/apply-when.test.ts`
- Modify: `packages/files-engine/src/index.ts`

- [ ] **Step 1: Write `src/types.ts`**

```typescript
/**
 * @module @architext/files-engine/types
 * Concepts: [[FileTree]]
 * Spec: §7.3 File-tree rules engine — output type
 * Depends on: none (pure types)
 * Consumed by: [[compute]], [[index]] (re-export)
 */

export interface FileTree {
  readonly paths: readonly string[];
  readonly byService: Readonly<Record<string, readonly string[]>>;
}
```

- [ ] **Step 2: Write the failing test**

`packages/files-engine/tests/apply-when.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { applyWhen } from "../src/apply-when";
import type { FileRule } from "@architext/catalog";
import type { ServiceKind } from "@architext/schema";

const presentIds = new Set(["typescript", "react"]);
const kind: ServiceKind = "frontend-app";

describe("applyWhen", () => {
  it("includes rules with no `when` clause", () => {
    const rule: FileRule = { path: "src/index.ts" };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });

  it("includes rules whose serviceKind matches", () => {
    const rule: FileRule = { path: "x", when: { serviceKind: ["frontend-app"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });

  it("excludes rules whose serviceKind doesn't match", () => {
    const rule: FileRule = { path: "x", when: { serviceKind: ["backend-service"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(false);
  });

  it("includes rules whose `requires` are all present", () => {
    const rule: FileRule = { path: "x", when: { requires: ["typescript"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });

  it("excludes rules whose `requires` are not all present", () => {
    const rule: FileRule = { path: "x", when: { requires: ["typescript", "vue"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(false);
  });

  it("includes rules whose `excludes` are all absent", () => {
    const rule: FileRule = { path: "x", when: { excludes: ["python"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });

  it("excludes rules whose `excludes` overlap with present ids", () => {
    const rule: FileRule = { path: "x", when: { excludes: ["typescript"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(false);
  });

  it("combines multiple `when` clauses with AND semantics", () => {
    const rule: FileRule = {
      path: "x",
      when: { serviceKind: ["frontend-app"], requires: ["typescript"], excludes: ["python"] },
    };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });
});
```

- [ ] **Step 3: Implement `src/apply-when.ts`**

```typescript
/**
 * @module @architext/files-engine/apply-when
 * Concepts: [[ApplyWhen]], [[FileRuleFilter]], [[Conjunction]]
 * Spec: §7.1 FileRule.when semantics — serviceKind allowlist, requires (all present), excludes (none present)
 * Depends on: [[@architext/catalog]] (FileRule), [[@architext/schema]] (ServiceKind)
 * Consumed by: [[compute]]
 */

import type { FileRule } from "@architext/catalog";
import type { ServiceKind } from "@architext/schema";

export function applyWhen(
  rule: FileRule,
  serviceKind: ServiceKind,
  presentIds: ReadonlySet<string>
): boolean {
  if (rule.when === undefined) return true;
  const w = rule.when;

  if (w.serviceKind !== undefined && !w.serviceKind.includes(serviceKind)) {
    return false;
  }
  if (w.requires !== undefined && !w.requires.every((id) => presentIds.has(id))) {
    return false;
  }
  if (w.excludes !== undefined && w.excludes.some((id) => presentIds.has(id))) {
    return false;
  }
  return true;
}
```

- [ ] **Step 4: Re-export from `index.ts`**

```typescript
/**
 * @module @architext/files-engine/index
 * Concepts: [[FilesEnginePublicAPI]], [[Barrel]]
 * Spec: §7.3 File-tree rules engine
 * Depends on: [[types]], [[apply-when]], [[compute]]
 * Consumed by: [[@architext/web]] (Files tab), [[@architext/cli]] (prompt enrichment)
 */

export * from "./types";
export * from "./apply-when";
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @architext/files-engine test
```
Expected: 8 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/files-engine/src/types.ts packages/files-engine/src/apply-when.ts packages/files-engine/src/index.ts packages/files-engine/tests/apply-when.test.ts
git commit -m "feat(files-engine): add FileTree type and applyWhen filter"
```

---

## Task 17: Always-files composer

**Files:**
- Create: `packages/files-engine/src/always-files.ts`
- Create: `packages/files-engine/tests/always-files.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/files-engine/tests/always-files.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { alwaysFiles } from "../src/always-files";

describe("alwaysFiles", () => {
  it("always includes architext-spec.json, README.md, .gitignore", () => {
    const paths = alwaysFiles();
    expect(paths).toContain("architext-spec.json");
    expect(paths).toContain("README.md");
    expect(paths).toContain(".gitignore");
  });

  it("returns paths in sorted order", () => {
    const paths = alwaysFiles();
    const sorted = [...paths].sort();
    expect(paths).toEqual(sorted);
  });
});
```

- [ ] **Step 2: Implement `src/always-files.ts`**

```typescript
/**
 * @module @architext/files-engine/always-files
 * Concepts: [[AlwaysFiles]], [[ProjectRoot]]
 * Spec: §7.3 File-tree rules engine — "Always emit: architext-spec.json (round-trip artifact), README.md, .gitignore"
 * Depends on: none
 * Consumed by: [[compute]]
 */

const ALWAYS = [".gitignore", "README.md", "architext-spec.json"] as const;

export function alwaysFiles(): readonly string[] {
  return ALWAYS;
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @architext/files-engine test
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/files-engine/src/always-files.ts packages/files-engine/tests/always-files.test.ts
git commit -m "feat(files-engine): add always-files composer"
```

---

## Task 18: `computeFileTree` core

**Files:**
- Create: `packages/files-engine/src/compute.ts`
- Create: `packages/files-engine/tests/compute.test.ts`
- Modify: `packages/files-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/files-engine/tests/compute.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeFileTree } from "../src/compute";
import { loadCatalog } from "@architext/catalog";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";

const catalog = loadCatalog();

const baseSpec: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Test", slug: "test" },
  groups: [],
  services: [],
  edges: [],
};

describe("computeFileTree", () => {
  it("emits always-files even for an empty spec", () => {
    const tree = computeFileTree(baseSpec, catalog);
    expect(tree.paths).toContain(".gitignore");
    expect(tree.paths).toContain("README.md");
    expect(tree.paths).toContain("architext-spec.json");
  });

  it("prefixes each service's files with its service name", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          position: { x: 0, y: 0 },
          components: [
            { id: "python", category: "language" },
            { id: "fastapi", category: "framework" },
          ],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("api/main.py");
    expect(tree.paths).toContain("api/requirements.txt");
    expect(tree.paths).toContain("api/pyproject.toml");
    expect(tree.byService.api).toEqual(
      expect.arrayContaining(["api/main.py", "api/pyproject.toml", "api/requirements.txt"])
    );
  });

  it("respects `requires` in file rules (e.g. tsx with typescript)", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "web",
          name: "web",
          kind: "frontend-app",
          position: { x: 0, y: 0 },
          components: [
            { id: "typescript", category: "language" },
            { id: "react", category: "library" },
          ],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("web/src/main.tsx");
    expect(tree.paths).not.toContain("web/src/main.jsx");
  });

  it("respects `excludes` in file rules (e.g. jsx without typescript)", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "web",
          name: "web",
          kind: "frontend-app",
          position: { x: 0, y: 0 },
          components: [{ id: "react", category: "library" }],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("web/src/main.jsx");
    expect(tree.paths).not.toContain("web/src/main.tsx");
  });

  it("groups services under a parent directory when group has 2+ services", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      groups: [
        {
          id: "g-be",
          name: "Backend",
          kind: "backend",
          serviceIds: ["api", "db"],
          position: { x: 0, y: 0 },
          size: { width: 400, height: 300 },
        },
      ],
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          groupId: "g-be",
          position: { x: 0, y: 0 },
          components: [{ id: "python", category: "language" }],
        },
        {
          id: "db",
          name: "db",
          kind: "database",
          groupId: "g-be",
          position: { x: 0, y: 0 },
          components: [{ id: "postgres", category: "datastore" }],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("Backend/api/pyproject.toml");
    expect(tree.paths).toContain("Backend/db/schema.sql");
  });

  it("inlines services when their group has only 1 service", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      groups: [
        {
          id: "g-be",
          name: "Backend",
          kind: "backend",
          serviceIds: ["api"],
          position: { x: 0, y: 0 },
          size: { width: 400, height: 300 },
        },
      ],
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          groupId: "g-be",
          position: { x: 0, y: 0 },
          components: [{ id: "python", category: "language" }],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("api/pyproject.toml");
    expect(tree.paths).not.toContain("Backend/api/pyproject.toml");
  });

  it("returns paths sorted and deduplicated", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          position: { x: 0, y: 0 },
          components: [
            { id: "python", category: "language" },
            { id: "django", category: "framework" }, // both produce requirements.txt
          ],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    const reqOccurrences = tree.paths.filter((p) => p === "api/requirements.txt").length;
    expect(reqOccurrences).toBe(1);
    expect(tree.paths).toEqual([...tree.paths].sort());
  });
});
```

- [ ] **Step 2: Implement `src/compute.ts`**

```typescript
/**
 * @module @architext/files-engine/compute
 * Concepts: [[ComputeFileTree]], [[Determinism]], [[GroupRule]], [[ServicePathPrefix]]
 * Spec: §7.3 File-tree rules engine — pure function consumed by web app and CLI; soft contract with the agent
 * Depends on: [[@architext/schema]] (ArchitextSpec), [[@architext/catalog]] (Catalog), [[apply-when]], [[always-files]]
 * Consumed by: [[index]] (re-export), [[@architext/web]] (Files tab), [[@architext/cli]] (prompt enrichment)
 */

import type { ArchitextSpec } from "@architext/schema";
import type { Catalog } from "@architext/catalog";
import type { FileTree } from "./types";
import { applyWhen } from "./apply-when";
import { alwaysFiles } from "./always-files";

export function computeFileTree(spec: ArchitextSpec, catalog: Catalog): FileTree {
  // Build group → directory rules: a group with 2+ services becomes a parent dir.
  const groupDirByGroupId = new Map<string, string>();
  for (const g of spec.groups) {
    if (g.serviceIds.length >= 2) {
      groupDirByGroupId.set(g.id, g.name);
    }
  }

  const byService: Record<string, string[]> = {};
  const allPaths = new Set<string>();

  for (const file of alwaysFiles()) {
    allPaths.add(file);
  }

  for (const service of spec.services) {
    const presentIds = new Set(service.components.map((c) => c.id));
    const groupDir = service.groupId !== undefined ? groupDirByGroupId.get(service.groupId) : undefined;
    const prefix = groupDir !== undefined ? `${groupDir}/${service.name}` : service.name;

    const servicePaths = new Set<string>();
    for (const comp of service.components) {
      const entry = catalog.byId(comp.id);
      if (entry === undefined) continue;
      for (const rule of entry.files ?? []) {
        if (applyWhen(rule, service.kind, presentIds)) {
          const fullPath = `${prefix}/${rule.path}`;
          servicePaths.add(fullPath);
          allPaths.add(fullPath);
        }
      }
    }

    byService[service.id] = [...servicePaths].sort();
  }

  return {
    paths: [...allPaths].sort(),
    byService,
  };
}
```

- [ ] **Step 3: Re-export from `index.ts`**

```typescript
/**
 * @module @architext/files-engine/index
 * Concepts: [[FilesEnginePublicAPI]], [[Barrel]]
 * Spec: §7.3 File-tree rules engine
 * Depends on: [[types]], [[apply-when]], [[always-files]], [[compute]]
 * Consumed by: [[@architext/web]] (Files tab), [[@architext/cli]] (prompt enrichment)
 */

export * from "./types";
export * from "./apply-when";
export * from "./always-files";
export * from "./compute";
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @architext/files-engine test
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/files-engine/src/compute.ts packages/files-engine/src/index.ts packages/files-engine/tests/compute.test.ts
git commit -m "feat(files-engine): add computeFileTree with group-dir and per-service prefixing"
```

---

## Task 19: Determinism + snapshot tests against golden specs

**Files:**
- Create: `packages/files-engine/tests/determinism.test.ts`
- Create: `packages/files-engine/tests/snapshot/frontend-backend-db.snap.json`
- Create: `packages/files-engine/tests/snapshot/microservices.snap.json`
- Create: `packages/files-engine/tests/snapshot.test.ts`

- [ ] **Step 1: Write `tests/determinism.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { computeFileTree } from "../src/compute";
import { loadCatalog } from "@architext/catalog";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";

const spec: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Det", slug: "det" },
  groups: [],
  services: [
    {
      id: "web",
      name: "web",
      kind: "frontend-app",
      position: { x: 0, y: 0 },
      components: [
        { id: "typescript", category: "language" },
        { id: "react", category: "library" },
        { id: "vite", category: "build-tool" },
      ],
    },
    {
      id: "api",
      name: "api",
      kind: "backend-service",
      position: { x: 0, y: 0 },
      components: [
        { id: "python", category: "language" },
        { id: "fastapi", category: "framework" },
      ],
    },
  ],
  edges: [],
};

describe("computeFileTree determinism", () => {
  const catalog = loadCatalog();

  it("produces identical output across invocations", () => {
    const a = computeFileTree(spec, catalog);
    const b = computeFileTree(spec, catalog);
    expect(b).toEqual(a);
  });

  it("produces identical paths for identical input regardless of service order", () => {
    const reordered: ArchitextSpec = {
      ...spec,
      services: [...spec.services].reverse(),
    };
    const a = computeFileTree(spec, loadCatalog());
    const b = computeFileTree(reordered, loadCatalog());
    expect(b.paths).toEqual(a.paths);
  });
});
```

- [ ] **Step 2: Write `tests/snapshot/frontend-backend-db.snap.json`**

```json
{
  "paths": [
    ".gitignore",
    "Backend/api/main.py",
    "Backend/api/pyproject.toml",
    "Backend/api/requirements.txt",
    "Backend/api/.python-version",
    "Backend/db/schema.sql",
    "README.md",
    "architext-spec.json",
    "web/index.html",
    "web/src/App.tsx",
    "web/src/main.tsx",
    "web/tsconfig.json",
    "web/vite.config.ts"
  ],
  "byService": {
    "web": [
      "web/index.html",
      "web/src/App.tsx",
      "web/src/main.tsx",
      "web/tsconfig.json",
      "web/vite.config.ts"
    ],
    "api": [
      "Backend/api/.python-version",
      "Backend/api/main.py",
      "Backend/api/pyproject.toml",
      "Backend/api/requirements.txt"
    ],
    "db": [
      "Backend/db/schema.sql"
    ]
  }
}
```

- [ ] **Step 3: Write `tests/snapshot/microservices.snap.json`**

```json
{
  "paths": [
    ".gitignore",
    "README.md",
    "Services/ingest/.nvmrc",
    "Services/ingest/package.json",
    "Services/processor/pyproject.toml",
    "Services/processor/.python-version",
    "architext-spec.json",
    "broker/"
  ],
  "byService": {
    "ingest": [
      "Services/ingest/.nvmrc",
      "Services/ingest/package.json"
    ],
    "processor": [
      "Services/processor/.python-version",
      "Services/processor/pyproject.toml"
    ],
    "broker": []
  }
}
```

> **Note:** the rabbitmq entry has no file rules, so the broker service contributes 0 files. The `"broker/"` placeholder above is illustrative; remove it after generating the real snapshot in Step 5 below.

- [ ] **Step 4: Write `tests/snapshot.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { computeFileTree } from "../src/compute";
import { loadCatalog } from "@architext/catalog";
import { ArchitextSpecSchema } from "@architext/schema";

const here = dirname(fileURLToPath(import.meta.url));
const REGENERATE = process.env.UPDATE_SNAPSHOTS === "1";

const cases = [
  {
    name: "frontend-backend-db",
    fixturePath: "../../schema/tests/fixtures/golden-frontend-backend-db.json",
    snapshotPath: "snapshot/frontend-backend-db.snap.json",
  },
  {
    name: "microservices",
    fixturePath: "../../schema/tests/fixtures/golden-microservices.json",
    snapshotPath: "snapshot/microservices.snap.json",
  },
];

describe("Files-engine snapshots vs schema golden fixtures", () => {
  const catalog = loadCatalog();

  for (const c of cases) {
    it(`${c.name} matches snapshot`, () => {
      const fixture = JSON.parse(readFileSync(resolve(here, c.fixturePath), "utf-8"));
      const spec = ArchitextSpecSchema.parse(fixture);
      const tree = computeFileTree(spec, catalog);
      const actual = { paths: tree.paths, byService: tree.byService };

      if (REGENERATE) {
        const fs = require("node:fs");
        fs.writeFileSync(
          resolve(here, c.snapshotPath),
          JSON.stringify(actual, null, 2) + "\n"
        );
      }

      const expected = JSON.parse(readFileSync(resolve(here, c.snapshotPath), "utf-8"));
      expect(actual).toEqual(expected);
    });
  }
});
```

- [ ] **Step 5: Generate / verify snapshots**

The illustrative snapshots in Steps 2 and 3 above are best-effort; the real source of truth is what `computeFileTree` produces against the catalog. Run:

```bash
UPDATE_SNAPSHOTS=1 pnpm --filter @architext/files-engine test snapshot
```

This writes the actual computed tree into the snapshot files. Inspect both `tests/snapshot/*.json` files — every path should be sensible (matches the components in the corresponding fixture). If anything looks wrong, fix the catalog or compute logic, then re-run.

After verifying, run without the env var:

```bash
pnpm --filter @architext/files-engine test
```
Expected: all tests pass — both determinism and snapshot.

- [ ] **Step 6: Commit**

```bash
git add packages/files-engine/tests/determinism.test.ts packages/files-engine/tests/snapshot packages/files-engine/tests/snapshot.test.ts
git commit -m "test(files-engine): add determinism and snapshot tests against golden specs"
```

---

## Task 20: Final integration smoke (cross-package import + full repo build)

**Files:**
- Create: `packages/files-engine/tests/integration.test.ts`

- [ ] **Step 1: Write the integration test**

`packages/files-engine/tests/integration.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeFileTree, applyWhen, alwaysFiles, type FileTree } from "../src";
import { loadCatalog } from "@architext/catalog";
import { loadPatterns, instantiatePattern } from "@architext/patterns";
import { ArchitextSpecSchema, SCHEMA_VERSION } from "@architext/schema";

describe("Plan 2 cross-package integration", () => {
  it("re-exports the public surface", () => {
    expect(typeof computeFileTree).toBe("function");
    expect(typeof applyWhen).toBe("function");
    expect(typeof alwaysFiles).toBe("function");
  });

  it("instantiates a pattern, validates as ArchitextSpec, and computes a non-empty file tree", () => {
    const catalog = loadCatalog();
    const patterns = loadPatterns();
    const pattern = patterns.byId("frontend-backend-db")!;

    let n = 0;
    const fragment = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);
    const spec = ArchitextSpecSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Smoke", slug: "smoke" },
      groups: fragment.groups,
      services: fragment.services,
      edges: fragment.edges,
    });

    const tree: FileTree = computeFileTree(spec, catalog);
    expect(tree.paths.length).toBeGreaterThan(3); // at minimum, the always-files + something per service
    expect(tree.paths).toContain(".gitignore");
    expect(tree.paths).toContain("README.md");
    expect(tree.paths).toContain("architext-spec.json");
    // Every service in the spec should have a byService entry (even if empty)
    for (const s of spec.services) {
      expect(tree.byService[s.id]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run all tests in the repo**

```bash
pnpm test
```
Expected: every test in every package passes (schema 67 + catalog ~25 + patterns ~20 + files-engine ~25 = ~135 total).

- [ ] **Step 3: Run all builds**

```bash
pnpm build
```
Expected: all four packages build cleanly with no warnings.

- [ ] **Step 4: Run all typechecks**

```bash
pnpm typecheck
```
Expected: passes.

- [ ] **Step 5: Pack each new package and inspect**

```bash
pnpm --filter @architext/catalog pack --pack-destination /tmp
pnpm --filter @architext/patterns pack --pack-destination /tmp
pnpm --filter @architext/files-engine pack --pack-destination /tmp

tar -tzf /tmp/architext-catalog-0.1.0.tgz | grep -E "(src|tests)/" && echo "FAIL: src or tests in tarball" || echo "OK: clean tarball (catalog)"
tar -tzf /tmp/architext-patterns-0.1.0.tgz | grep -E "(src|tests)/" && echo "FAIL: src or tests in tarball" || echo "OK: clean tarball (patterns)"
tar -tzf /tmp/architext-files-engine-0.1.0.tgz | grep -E "(src|tests)/" && echo "FAIL: src or tests in tarball" || echo "OK: clean tarball (files-engine)"

rm /tmp/architext-catalog-0.1.0.tgz /tmp/architext-patterns-0.1.0.tgz /tmp/architext-files-engine-0.1.0.tgz
```
Expected: three "OK: clean tarball" lines.

- [ ] **Step 6: Commit**

```bash
git add packages/files-engine/tests/integration.test.ts
git commit -m "test(files-engine): add cross-package integration smoke test"
```

---

## Self-Review Checklist (run after final commit)

- [ ] **Spec coverage:** §7.1 (catalog entry schema) → Task 2. §7.2 (≥22 v1 entries across 8 categories) → Tasks 4–8. §7.3 (file-tree rules engine + always-files) → Tasks 16–19. §7.4 (≥5 v1 patterns + atomic instantiate) → Tasks 12–14. §4.4 (component compatibility allowlists) → catalog data files in Tasks 4–8.

- [ ] **Reserved-fields posture:** none of the v1.5+ reserved fields (`contracts`, `replicas`, `containerization`, `deployTarget`, `envTier`) appear in any catalog entry, pattern, or files-engine output. Confirm:
  ```bash
  grep -nE "contracts|replicas|containerization|deployTarget|envTier" packages/catalog/src packages/patterns/src packages/files-engine/src || echo "OK"
  ```

- [ ] **Type consistency:** `Catalog` interface uses `byId`, `byCategory`, `byCompatibleServiceKind`, `byKindIfService` consistently across catalog.ts, load.ts, and downstream uses in files-engine. `Pattern.fragment` uses `tmpId` / `tmpGroupId` consistently across types.ts, instantiate.ts, and every data/*.ts.

- [ ] **No placeholders:** search `docs/superpowers/plans/2026-05-06-catalog-patterns-files-engine.md` for `TBD|TODO|FIXME|XXX` — should be none.

- [ ] **Final state:** `pnpm test && pnpm build && pnpm typecheck` all succeed at HEAD.

---

## What This Plan Delivers

After completion of all 20 tasks:

- **`@architext/catalog`** — 22+ v1 entries across 8 categories (languages, runtimes, frontend, build tools, backend, datastores, queues, auth, entry points). Discriminated-union schema enforces the dropsAs invariant. Helper accessors (`byId`, `byCategory`, `byCompatibleServiceKind`, `byKindIfService`) make palette filtering and rule lookup O(1) / O(N).
- **`@architext/patterns`** — 5 v1 patterns (REST API + DB, Frontend + Backend + DB, Worker + Queue, Cached API, Microservices skeleton). `instantiatePattern` does atomic id remap + position offset; the result wraps into a valid `ArchitextSpec` end-to-end (golden test).
- **`@architext/files-engine`** — Pure `computeFileTree(spec, catalog)` function consumed by both web app (Files tab) and CLI (prompt enrichment). Honors `requires` / `excludes` / `serviceKind` clauses, applies the group-→-directory rule, deduplicates and sorts. Snapshot-tested against the schema package's golden fixtures.

This is the **data foundation** Plan 3 (CLI + meta-prompt) and Plan 4 (web app) consume. With this in place, the CLI can enrich its meta-prompt with predicted files, and the web app can render the palette and Files tab without writing any logic of its own.
