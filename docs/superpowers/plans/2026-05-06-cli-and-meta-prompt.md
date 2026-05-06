# Architext CLI + Meta-Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a publish-ready `@architext/cli` package that runs as `npx architext` with `apply` / `validate` / `init` subcommands, plus the versioned meta-prompt at `prompts/scaffold-v0.1.0.md` that the CLI hands to the agent. Together they form the contract handoff: spec.json + meta-prompt → AI agent → scaffolded repo.

**Architecture:** Commander.js-driven CLI with a pluggable `AgentBackend` interface. Two backends ship in v1 (`mock` for tests, `claude-code` for production). The meta-prompt lives as a versioned text artifact loaded by `spec.schemaVersion`. The full prompt sent to the agent = meta-prompt + serialized spec + optional `--instructions`. All commands return clean exit codes; errors are rendered with file:line for invalid JSON and `path.to.field` for invalid schema.

**Tech Stack:** Same as Plans 1–2 — Node 20+, pnpm 10+, TypeScript 5.4+ strict, Vitest, tsup, plus `commander` (CLI framework), `chalk` (color), `ora` (spinner). Workspace deps on `@architext/schema`.

**Spec reference:** `docs/superpowers/specs/2026-05-02-architext-design.md` — primarily Section 5 (CLI & Agent Handoff). Section 9 step 5–6 of the build sequence.

---

## File Structure

```
architext/
├── prompts/
│   └── scaffold-v0.1.0.md                     # versioned meta-prompt (text artifact)
└── packages/
    └── cli/
        ├── package.json                       # @architext/cli, "bin": { "architext": "./dist/bin.js" }
        ├── tsconfig.json
        ├── tsup.config.ts                     # builds bin.ts as a Node-shebang executable
        ├── vitest.config.ts
        ├── README.md
        ├── src/
        │   ├── index.ts                       # programmatic API barrel (for tests + future Node consumers)
        │   ├── bin.ts                         # Node entry point (#!/usr/bin/env node + runCli)
        │   ├── cli.ts                         # commander wiring; exports runCli(argv) for testing
        │   ├── errors.ts                      # ExitCode enum, ApplyError class, formatZodError
        │   ├── prompt/
        │   │   ├── load.ts                    # loadMetaPrompt(version): string
        │   │   └── build.ts                   # buildPrompt(meta, spec, instructions?): string
        │   ├── agent/
        │   │   ├── backend.ts                 # AgentBackend interface + AgentRun type
        │   │   ├── mock.ts                    # MockBackend used by tests
        │   │   ├── claude-code.ts             # ClaudeCodeBackend (spawns `claude` subprocess)
        │   │   └── select.ts                  # selectBackend(name): AgentBackend
        │   ├── status.ts                      # StatusBar class (in-place ANSI tail-counter)
        │   └── commands/
        │       ├── validate.ts                # `architext validate ./spec.json`
        │       ├── init.ts                    # `architext init [name]`
        │       └── apply.ts                   # `architext apply ./spec.json [opts]`
        └── tests/
            ├── errors.test.ts
            ├── prompt-load.test.ts
            ├── prompt-build.test.ts
            ├── agent-mock.test.ts
            ├── agent-select.test.ts
            ├── status.test.ts
            ├── cmd-validate.test.ts
            ├── cmd-init.test.ts
            ├── cmd-apply.test.ts
            └── integration.test.ts
```

**Why this split:** Each `src/` file has one job — `errors.ts` knows exit codes, `prompt/load.ts` only reads from disk, `prompt/build.ts` only assembles strings. Backends are parallel implementations of one interface (`backend.ts`). Commands import what they need — the only file that knows about *all* of them is `cli.ts`. Tests mirror src 1:1.

**Cross-package imports:** CLI takes `workspace:*` deps on `@architext/schema` (Zod validator + types). It does NOT depend on `@architext/catalog`, `@architext/patterns`, or `@architext/files-engine` for v1 — the meta-prompt is the only enrichment surface. Plans 4+ may add files-engine for prompt enrichment.

**Header convention reminder:** Every `.ts` file under `src/` gets a JSDoc header (`@module` / `Concepts:` / `Spec:` / `Depends on:` / `Consumed by:`). Test files do not need headers. The meta-prompt file (`prompts/scaffold-v0.1.0.md`) has its own version-pinned heading.

---

## Task 1: CLI package skeleton + bin entry

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/tsup.config.ts`
- Create: `packages/cli/vitest.config.ts`
- Create: `packages/cli/README.md`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/bin.ts`

- [ ] **Step 1: Write `packages/cli/package.json`**

The `bin` field is what makes `npx architext` work. The `files` array includes `prompts/` so the meta-prompt ships with the published tarball — but since prompts live at the repo root, we use the `files` field to copy them at pack time (handled below in tsup).

```json
{
  "name": "@architext/cli",
  "version": "0.1.0",
  "description": "Apply an Architext spec to scaffold a project via an AI agent",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "architext": "./dist/bin.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "prompts", "README.md"],
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
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.2",
    "vitest": "^1.6.0",
    "typescript": "^5.4.5"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Write `packages/cli/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Write `packages/cli/tsup.config.ts`**

`bin.ts` produces both ESM and CJS, but the bin entry must be ESM with `node` shebang. tsup's `banner` injects the shebang only for the main bin file; we copy the prompts/ directory at build time so packaged bundles have the meta-prompts on disk.

```typescript
import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  banner: ({ format }) => {
    return format === "esm"
      ? { js: "#!/usr/bin/env node\n// @architext/cli — auto-generated; see src/bin.ts" }
      : { js: "#!/usr/bin/env node\n// @architext/cli — auto-generated; see src/bin.ts" };
  },
  onSuccess: async () => {
    // Copy prompts/ from repo root into the package so it ships with the tarball.
    const repoRoot = resolve(__dirname, "..", "..");
    const src = resolve(repoRoot, "prompts");
    const dest = resolve(__dirname, "prompts");
    try {
      mkdirSync(dest, { recursive: true });
      copyFileSync(
        resolve(src, "scaffold-v0.1.0.md"),
        resolve(dest, "scaffold-v0.1.0.md")
      );
    } catch (err) {
      console.warn("[tsup onSuccess] could not copy prompts:", err);
    }
  },
});
```

The `banner` adds `#!/usr/bin/env node` to *all* bundled files. That's fine: only the file referenced by `bin.architext` is treated as a shell entry; the others are imported as modules and the shebang line is harmless (Node ignores it on imports).

- [ ] **Step 4: Write `packages/cli/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
```

- [ ] **Step 5: Write `packages/cli/README.md`**

```markdown
# @architext/cli

The `npx architext` CLI for [Architext](../../README.md).

Reads a spec produced by the canvas, validates it, and hands it to an AI coding agent (Claude Code or Archon) to scaffold the project into the current working directory.

## Usage

```bash
npx architext apply ./spec.json                            # default backend: claude-code
npx architext apply ./spec.json --agent claude-code        # explicit
npx architext apply ./spec.json --instructions "use bun"
npx architext apply ./spec.json --dry-run                  # print final prompt and exit
npx architext apply ./spec.json --force                    # overwrite existing dir

npx architext validate ./spec.json
npx architext init [project-name]
npx architext --version
npx architext --help
```

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Generic / unexpected error |
| 2 | Spec doesn't parse or fails schema validation |
| 3 | Agent CLI not on PATH |
| 4 | Target dir exists, no `--force` |
| 5 | Agent crashed mid-run |
| 6 | Agent finished with `ARCHITEXT_FAILED` |
```

- [ ] **Step 6: Write `packages/cli/src/index.ts` (programmatic API barrel)**

```typescript
/**
 * @module @architext/cli/index
 * Concepts: [[CliPublicAPI]], [[Barrel]], [[ProgrammaticAPI]]
 * Spec: §5 CLI & Agent Handoff — exported for embedding & tests
 * Depends on: [[cli]], [[errors]], [[agent/backend]]
 * Consumed by: tests, future programmatic consumers
 */

export {};
```

- [ ] **Step 7: Write `packages/cli/src/bin.ts` (Node entry point — placeholder)**

This file is filled in for real in Task 13 (commander wiring). The placeholder lets the package build.

```typescript
/**
 * @module @architext/cli/bin
 * Concepts: [[CliEntry]], [[Shebang]]
 * Spec: §5.1 Command surface — npx architext entry
 * Depends on: [[cli]] (runCli)
 * Consumed by: end users via `npx architext`
 */

// Filled in by Task 13. For now, a no-op so the bin field has a valid file.
process.exit(0);
```

- [ ] **Step 8: Install + typecheck + commit**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm install
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli run typecheck
git add packages/cli pnpm-lock.yaml
git commit -m "chore(cli): scaffold @architext/cli package"
```

---

## Task 2: Meta-prompt v0.1.0

**Files:**
- Create: `prompts/scaffold-v0.1.0.md`

This is a text artifact, not code — it doesn't go through TDD. The content drives agent behavior, so review it carefully. Future versions live as `prompts/scaffold-v0.2.0.md` etc., selected by `spec.schemaVersion` at CLI runtime.

- [ ] **Step 1: Write `prompts/scaffold-v0.1.0.md` verbatim**

```markdown
# Architext Scaffold Prompt v0.1.0

You are scaffolding a project from a structured architecture specification.
Your job is to produce a running, idiomatic codebase that matches the spec
exactly. The user will run the resulting project with each service's standard
local dev command (e.g., `npm run dev`, `uvicorn main:app --reload`).

## Hard Constraints

- Write all files into the current working directory. Do NOT cd elsewhere.
- No Docker, no docker-compose, no Kubernetes — defer containerization.
- Each service must run with its standard local dev command after `npm install`
  / `pip install` etc. Document the dev command in the per-service README.
- Honor exact component versions when the spec specifies a `version` field.
  If no version is given, use the latest stable release of that component.
- Use the `protocol` field on each edge to determine wire format. The
  per-protocol guidance below is authoritative.
- Generate code that compiles / imports cleanly on first try. If a service has
  a TypeScript component, emit `tsconfig.json`. If a service has Python,
  emit `pyproject.toml` or `requirements.txt`. Etc.

## Spec Concepts

- **Groups** are logical containers. Emit a top-level directory per group only
  when the group has 2+ services. Otherwise, the service lives at the repo
  root with no group prefix.
- **Services** become directories with their own dependency manifest
  (package.json, pyproject.toml, go.mod, etc.) and an entry-point file.
- **Components** are libraries / frameworks / languages installed inside a
  service. Use the canonical install command for the ecosystem (`npm install`,
  `pip install`, `go get`).
- **Edges** are typed connections — generate the corresponding client code on
  the `from` side and the corresponding server / handler on the `to` side.
- **The spec's project.slug is the recommended top-level project name.** Use
  it for the package name, repository name, and README title.

## Per-Service-Kind Guidance

### `frontend-app`
Emit a SPA scaffold matching the framework component. For React + Vite:
`index.html`, `src/main.tsx` (or `.jsx`), `src/App.tsx`, `vite.config.ts`,
`tsconfig.json` (if TypeScript), `package.json` with `dev`, `build`,
`preview` scripts. For Next.js: `next.config.js`, `app/layout.tsx`,
`app/page.tsx`, etc. For Vue: `src/App.vue`, `src/main.ts`, `index.html`.

### `backend-service`
Emit a server scaffold matching the framework. For Express+TS: `src/index.ts`
with `app.listen(...)`. For FastAPI: `main.py` with `app = FastAPI()`. For
NestJS: `src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`. For
Django: `manage.py`, project module with `settings.py` and `urls.py`. Always
emit a `package.json` / `requirements.txt` listing the framework + listed
edges' client libraries.

### `worker`
Emit a long-running background process. The entry-point depends on the
service's `entry-point` components: a `queue-consumer` component implies the
service subscribes to an inbound queue; a `scheduled-job` component implies a
cron-like loop. Workers do NOT bind a port. Provide a `start` / `dev` script.

### `database`
Emit a `schema.sql` (Postgres / MySQL) or `schema.json` (MongoDB) file. Do
NOT emit application code in a `database` service — only the schema. Connection
information is consumed by the `from` side of any inbound `sql` or `key-value`
edge.

### `cache`
Emit no source files. The cache is referenced by edges; only the consuming
side gets a client. Optionally emit a `redis.conf` (or equivalent) if the
spec specifies non-default ports / configs.

### `queue`
Emit no source files unless the spec specifies broker config. Emit broker
config as `rabbitmq.conf` (or equivalent) when port / vhost differs from
defaults.

### `sidecar`
Emit a minimal observability scaffold (e.g., `otel-collector.yaml`) — usually
no application code.

### `external-api`
Emit a small client-stubs file with TypeScript / Python type interfaces for
the external service's responses. Treat it as a typed dependency, not a
service to run.

## Per-Protocol Guidance

For every edge `from → to` with the given protocol, emit BOTH ends:

### `http`
- On the `from` side: a typed HTTP client (axios for Node, httpx for Python).
  Use the `basePath` field as the prefix and `port` for the host port.
- On the `to` side: a route handler (Express route, FastAPI endpoint, Hono
  handler) at `basePath` returning a 200 stub.

### `graphql`
- On the `from` side: a GraphQL client (urql or Apollo Client for JS, gql
  for Python) initialized at the `path` URL.
- On the `to` side: a GraphQL server (graphql-yoga, Strawberry, Apollo
  Server) with one example query / mutation at `path`.

### `grpc`
- Emit a `<edge>.proto` file with one example service definition.
- On the `from` side: a generated gRPC client (`@grpc/grpc-js` for Node,
  `grpcio` for Python).
- On the `to` side: a gRPC server bound to `port`.

### `websocket`
- On the `from` side: a `WebSocket` client connecting to `path`.
- On the `to` side: a server-side upgrade handler echoing messages.

### `queue`
- On the `from` side (producer): a `publish(topic, payload)` helper using
  the spec's `topicName`. Use the `broker` field if specified, else default
  to amqp://localhost / redis://localhost as appropriate.
- On the `to` side (consumer): a `subscribe(topic, handler)` helper that
  invokes the user's handler for each message.

### `sql`
- On the `from` side: a connection pool (Prisma / Knex / SQLAlchemy /
  database/sql in Go) with the connection string `<protocol>://<user>:<pass>@<host>:<port>/<database>`.
- On the `to` side (the database service): no client code — see Database
  guidance above for schema.

### `key-value`
- On the `from` side: a Redis client (ioredis / redis-py) initialized with
  the optional `namespace` as a key prefix.
- On the `to` side (cache service): no client code.

### `fs`
- On the `from` side: a small `read(path)` / `write(path, data)` helper
  rooted at the spec's `mountPath`. Use Node's `fs/promises` or Python's
  `pathlib`.

## Repo-Wide Files

Always produce:
- `README.md` at the project root, naming each service and its dev command.
- `.gitignore` covering Node (`node_modules/`, `dist/`), Python (`__pycache__/`,
  `*.pyc`, `.venv/`), and editor files (`.vscode/`, `.idea/`, `.DS_Store`).
- `architext-spec.json` — copy the input spec verbatim into the repo root for
  round-trip / regenerate workflows.

## Output Protocol

1. First, output a single JSON plan on its own line (no surrounding prose):
   `{ "services": [{ "name": "<service.name>", "files": ["<rel/path>", ...] }] }`
2. Then, write each file using your file-writing tools. Path strings must
   match what you announced in step 1 — don't add or skip files silently.
3. Finish with the literal token, on its own line:
   `ARCHITEXT_DONE`
4. If you cannot complete the scaffold, finish with the token, on its own line:
   `ARCHITEXT_FAILED <one-line reason>`

The CLI watches stdout for these sentinel lines. Do not include them as part
of any other text.

## The Spec

Below is the JSON spec to scaffold. Treat it as the contract — every Service
listed here must end up as a directory in the output, every Edge must end up
as wired client + server stubs.
```

- [ ] **Step 2: Verify file presence**

```bash
test -f prompts/scaffold-v0.1.0.md && echo "OK: prompt file present" || echo "FAIL"
```
Expected: `OK: prompt file present`

- [ ] **Step 3: Commit**

```bash
git add prompts/scaffold-v0.1.0.md
git commit -m "feat(prompts): add scaffold meta-prompt v0.1.0"
```

---

## Task 3: Errors module (exit codes + ApplyError + Zod formatter)

**Files:**
- Create: `packages/cli/src/errors.ts`
- Create: `packages/cli/tests/errors.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test** at `packages/cli/tests/errors.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ExitCode, ApplyError, formatZodError } from "../src/errors";

describe("ExitCode", () => {
  it("has the documented codes", () => {
    expect(ExitCode.Success).toBe(0);
    expect(ExitCode.Generic).toBe(1);
    expect(ExitCode.SpecInvalid).toBe(2);
    expect(ExitCode.AgentNotInstalled).toBe(3);
    expect(ExitCode.TargetExists).toBe(4);
    expect(ExitCode.AgentCrashed).toBe(5);
    expect(ExitCode.AgentFailedSentinel).toBe(6);
  });
});

describe("ApplyError", () => {
  it("carries an exit code and message", () => {
    const err = new ApplyError(ExitCode.TargetExists, "dir already exists: my-app");
    expect(err.code).toBe(ExitCode.TargetExists);
    expect(err.message).toBe("dir already exists: my-app");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("formatZodError", () => {
  const Schema = z.object({
    a: z.object({ b: z.string().min(3) }),
  });

  it("renders one line per issue with dotted path", () => {
    const result = Schema.safeParse({ a: { b: "x" } });
    if (result.success) throw new Error("expected fail");
    const text = formatZodError(result.error);
    expect(text).toContain("a.b");
    expect(text).toMatch(/at least 3/i);
  });

  it("returns empty string for empty issues array", () => {
    expect(formatZodError({ issues: [] } as unknown as z.ZodError)).toBe("");
  });
});
```

- [ ] **Step 2: Implement** `packages/cli/src/errors.ts`:

```typescript
/**
 * @module @architext/cli/errors
 * Concepts: [[ExitCode]], [[ApplyError]], [[ZodErrorFormatting]]
 * Spec: §5.6 Error handling — exit codes table
 * Depends on: zod
 * Consumed by: every command, [[bin]] (top-level catch), [[cli]] (runCli return value)
 */

import type { ZodError } from "zod";

export enum ExitCode {
  Success = 0,
  Generic = 1,
  SpecInvalid = 2,
  AgentNotInstalled = 3,
  TargetExists = 4,
  AgentCrashed = 5,
  AgentFailedSentinel = 6,
}

export class ApplyError extends Error {
  constructor(public readonly code: ExitCode, message: string) {
    super(message);
    this.name = "ApplyError";
  }
}

export function formatZodError(err: ZodError): string {
  if (!err.issues || err.issues.length === 0) return "";
  return err.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      return `  ${path}: ${issue.message}`;
    })
    .join("\n");
}
```

- [ ] **Step 3: Re-export from `index.ts`** (preserve header):

```typescript
/**
 * @module @architext/cli/index
 * Concepts: [[CliPublicAPI]], [[Barrel]], [[ProgrammaticAPI]]
 * Spec: §5 CLI & Agent Handoff — exported for embedding & tests
 * Depends on: [[cli]], [[errors]], [[agent/backend]]
 * Consumed by: tests, future programmatic consumers
 */

export * from "./errors";
```

- [ ] **Step 4: Run tests + typecheck**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli test
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli run typecheck
```
Expected: 4 tests pass, typecheck clean.

> **Note:** the test file imports `zod` directly. Since `@architext/schema` already lists `zod` as a dependency and is a `workspace:*` peer, zod is hoisted into the root `node_modules`. If the test fails with `Cannot find package 'zod'`, add `"zod": "^3.23.8"` to `packages/cli/package.json` `dependencies`. Most likely it'll just work.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/errors.ts packages/cli/src/index.ts packages/cli/tests/errors.test.ts
git commit -m "feat(cli): add ExitCode, ApplyError, and formatZodError"
```

---

## Task 4: Prompt loader (`loadMetaPrompt`)

**Files:**
- Create: `packages/cli/src/prompt/load.ts`
- Create: `packages/cli/tests/prompt-load.test.ts`
- Modify: `packages/cli/src/index.ts`

The loader resolves the prompts directory relative to the package install location at runtime: `<package>/prompts/scaffold-v<version>.md`. In dev (running from source), this resolves to `packages/cli/prompts/...` which is created by `tsup`'s `onSuccess` step — but since tests run BEFORE the build, the loader needs a fallback that walks up to the repo root.

- [ ] **Step 1: Write the failing test** at `packages/cli/tests/prompt-load.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadMetaPrompt } from "../src/prompt/load";
import { ApplyError, ExitCode } from "../src/errors";

describe("loadMetaPrompt", () => {
  it("loads the v0.1.0 prompt content", () => {
    const text = loadMetaPrompt("0.1.0");
    expect(text).toContain("# Architext Scaffold Prompt v0.1.0");
    expect(text).toContain("ARCHITEXT_DONE");
    expect(text).toContain("ARCHITEXT_FAILED");
  });

  it("throws ApplyError with SpecInvalid code for unknown versions", () => {
    let caught: unknown;
    try {
      loadMetaPrompt("9.9.9");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApplyError);
    expect((caught as ApplyError).code).toBe(ExitCode.SpecInvalid);
    expect((caught as ApplyError).message).toMatch(/9\.9\.9/);
    expect((caught as ApplyError).message).toMatch(/upgrade/i);
  });
});
```

- [ ] **Step 2: Implement** `packages/cli/src/prompt/load.ts`:

```typescript
/**
 * @module @architext/cli/prompt/load
 * Concepts: [[MetaPrompt]], [[VersionedArtifact]]
 * Spec: §5.3 Meta-prompt — versioned text loaded by spec.schemaVersion
 * Depends on: [[errors]] (ApplyError, ExitCode), node:fs, node:url
 * Consumed by: [[commands/apply]], [[prompt/build]]
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ApplyError, ExitCode } from "../errors";

// Search order:
//   1. <package>/prompts/scaffold-v<version>.md   (after tsup `onSuccess` copies)
//   2. <repo-root>/prompts/scaffold-v<version>.md (dev mode, before build)
function candidatePaths(version: string): string[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const filename = `scaffold-v${version}.md`;
  return [
    resolve(here, "..", "..", "prompts", filename),     // dist/prompt/load.js → dist/../prompts
    resolve(here, "..", "prompts", filename),           // src/prompt/load.ts → src/../prompts (after onSuccess)
    resolve(here, "..", "..", "..", "..", "prompts", filename), // monorepo: packages/cli/src/prompt → /repo/prompts
  ];
}

export function loadMetaPrompt(version: string): string {
  for (const p of candidatePaths(version)) {
    if (existsSync(p)) {
      return readFileSync(p, "utf-8");
    }
  }
  throw new ApplyError(
    ExitCode.SpecInvalid,
    `unknown schemaVersion: ${version}. Upgrade @architext/cli or downgrade your spec.`
  );
}
```

- [ ] **Step 3: Re-export from `index.ts`**:

```typescript
/**
 * @module @architext/cli/index
 * Concepts: [[CliPublicAPI]], [[Barrel]], [[ProgrammaticAPI]]
 * Spec: §5 CLI & Agent Handoff — exported for embedding & tests
 * Depends on: [[cli]], [[errors]], [[agent/backend]]
 * Consumed by: tests, future programmatic consumers
 */

export * from "./errors";
export * from "./prompt/load";
```

- [ ] **Step 4: Run tests + typecheck**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli test
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli run typecheck
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/prompt/load.ts packages/cli/src/index.ts packages/cli/tests/prompt-load.test.ts
git commit -m "feat(cli): add loadMetaPrompt with version-keyed file resolution"
```

---

## Task 5: Prompt builder (`buildPrompt`)

**Files:**
- Create: `packages/cli/src/prompt/build.ts`
- Create: `packages/cli/tests/prompt-build.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test** at `packages/cli/tests/prompt-build.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildPrompt } from "../src/prompt/build";
import type { ArchitextSpec } from "@architext/schema";

const minimalSpec: ArchitextSpec = {
  schemaVersion: "0.1.0",
  project: { name: "Test", slug: "test" },
  groups: [],
  services: [],
  edges: [],
};

describe("buildPrompt", () => {
  it("contains the meta-prompt followed by the spec JSON", () => {
    const out = buildPrompt("META PROMPT BODY", minimalSpec);
    expect(out).toContain("META PROMPT BODY");
    expect(out).toContain('"schemaVersion": "0.1.0"');
    expect(out).toContain('"slug": "test"');
    expect(out.indexOf("META PROMPT BODY")).toBeLessThan(out.indexOf('"schemaVersion"'));
  });

  it("appends optional --instructions block when provided", () => {
    const out = buildPrompt("META", minimalSpec, "use bun instead of node");
    expect(out).toContain("Additional Instructions");
    expect(out).toContain("use bun instead of node");
    expect(out.indexOf("Additional Instructions")).toBeLessThan(out.indexOf('"schemaVersion"'));
  });

  it("omits the instructions section when no instructions are passed", () => {
    const out = buildPrompt("META", minimalSpec);
    expect(out).not.toContain("Additional Instructions");
  });

  it("emits the spec inside a fenced JSON code block", () => {
    const out = buildPrompt("META", minimalSpec);
    expect(out).toMatch(/```json\n[\s\S]+\n```/);
  });
});
```

- [ ] **Step 2: Implement** `packages/cli/src/prompt/build.ts`:

```typescript
/**
 * @module @architext/cli/prompt/build
 * Concepts: [[PromptAssembly]], [[FullPrompt]]
 * Spec: §5.2 step 5 — final prompt = meta-prompt + spec + optional instructions
 * Depends on: [[@architext/schema]] (ArchitextSpec)
 * Consumed by: [[commands/apply]]
 */

import type { ArchitextSpec } from "@architext/schema";

export function buildPrompt(
  meta: string,
  spec: ArchitextSpec,
  instructions?: string
): string {
  const parts: string[] = [meta];

  if (instructions !== undefined && instructions.trim().length > 0) {
    parts.push("");
    parts.push("## Additional Instructions");
    parts.push("");
    parts.push(instructions.trim());
  }

  parts.push("");
  parts.push("```json");
  parts.push(JSON.stringify(spec, null, 2));
  parts.push("```");

  return parts.join("\n");
}
```

- [ ] **Step 3: Re-export from `index.ts`**:

```typescript
/**
 * @module @architext/cli/index
 * Concepts: [[CliPublicAPI]], [[Barrel]], [[ProgrammaticAPI]]
 * Spec: §5 CLI & Agent Handoff — exported for embedding & tests
 * Depends on: [[cli]], [[errors]], [[agent/backend]]
 * Consumed by: tests, future programmatic consumers
 */

export * from "./errors";
export * from "./prompt/load";
export * from "./prompt/build";
```

- [ ] **Step 4: Run tests + typecheck**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli test
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli run typecheck
```
Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/prompt/build.ts packages/cli/src/index.ts packages/cli/tests/prompt-build.test.ts
git commit -m "feat(cli): add buildPrompt to assemble meta + spec + instructions"
```

---

## Task 6: AgentBackend interface

**Files:**
- Create: `packages/cli/src/agent/backend.ts`
- Modify: `packages/cli/src/index.ts`

This task is types-only. There's no test file because there's no logic — the interface gets exercised by Tasks 7 (mock) and 11 (claude-code).

- [ ] **Step 1: Implement** `packages/cli/src/agent/backend.ts`:

```typescript
/**
 * @module @architext/cli/agent/backend
 * Concepts: [[AgentBackend]], [[AgentRun]], [[BackendInterface]]
 * Spec: §5.4 Agent backends
 * Depends on: none (interface only)
 * Consumed by: [[agent/mock]], [[agent/claude-code]], [[agent/select]], [[commands/apply]]
 */

export type AgentRunResult =
  | { kind: "done"; filesWritten: number }
  | { kind: "failed"; reason: string }
  | { kind: "crashed"; stderrTail: string };

export interface AgentRun {
  /** Promise resolving when the agent finishes (sentinel reached, exit, or crash). */
  readonly done: Promise<AgentRunResult>;
  /** Async iterator over stdout lines as they arrive. */
  readonly stdoutLines: AsyncIterable<string>;
}

export interface AgentBackend {
  readonly name: string;
  isInstalled(): Promise<boolean>;
  spawn(prompt: string, opts: { cwd: string }): AgentRun;
}
```

- [ ] **Step 2: Re-export from `index.ts`**:

```typescript
/**
 * @module @architext/cli/index
 * Concepts: [[CliPublicAPI]], [[Barrel]], [[ProgrammaticAPI]]
 * Spec: §5 CLI & Agent Handoff — exported for embedding & tests
 * Depends on: [[cli]], [[errors]], [[agent/backend]]
 * Consumed by: tests, future programmatic consumers
 */

export * from "./errors";
export * from "./prompt/load";
export * from "./prompt/build";
export * from "./agent/backend";
```

- [ ] **Step 3: Typecheck**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/agent/backend.ts packages/cli/src/index.ts
git commit -m "feat(cli): add AgentBackend interface"
```

---

## Task 7: Mock backend

**Files:**
- Create: `packages/cli/src/agent/mock.ts`
- Create: `packages/cli/tests/agent-mock.test.ts`
- Modify: `packages/cli/src/index.ts`

The mock backend lets tests exercise the full `apply` pipeline without spawning a real subprocess. It accepts a configuration that controls outcome (done / failed / crashed) and a list of files to "write" into `cwd`.

- [ ] **Step 1: Write the failing test** at `packages/cli/tests/agent-mock.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { MockAgentBackend } from "../src/agent/mock";

function mktmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-test-"));
}

describe("MockAgentBackend", () => {
  it("reports installed=true by default", async () => {
    const m = new MockAgentBackend({ outcome: "done" });
    expect(await m.isInstalled()).toBe(true);
  });

  it("can be configured to report installed=false", async () => {
    const m = new MockAgentBackend({ outcome: "done", installed: false });
    expect(await m.isInstalled()).toBe(false);
  });

  it("on outcome 'done', writes files and resolves with kind=done", async () => {
    const cwd = mktmp();
    const m = new MockAgentBackend({
      outcome: "done",
      filesToWrite: [
        { path: "a.txt", content: "hello" },
        { path: "sub/b.txt", content: "world" },
      ],
    });
    const run = m.spawn("any prompt", { cwd });
    const result = await run.done;
    expect(result).toEqual({ kind: "done", filesWritten: 2 });
    expect(readFileSync(resolve(cwd, "a.txt"), "utf-8")).toBe("hello");
    expect(readFileSync(resolve(cwd, "sub/b.txt"), "utf-8")).toBe("world");
  });

  it("on outcome 'failed', resolves with kind=failed and the configured reason", async () => {
    const cwd = mktmp();
    const m = new MockAgentBackend({ outcome: "failed", failureReason: "could not understand spec" });
    const run = m.spawn("p", { cwd });
    const result = await run.done;
    expect(result).toEqual({ kind: "failed", reason: "could not understand spec" });
  });

  it("on outcome 'crashed', resolves with kind=crashed and stderr tail", async () => {
    const cwd = mktmp();
    const m = new MockAgentBackend({ outcome: "crashed", stderrTail: "segfault\nat foo" });
    const run = m.spawn("p", { cwd });
    const result = await run.done;
    expect(result).toEqual({ kind: "crashed", stderrTail: "segfault\nat foo" });
  });

  it("emits one stdout line per file written, then the sentinel", async () => {
    const cwd = mktmp();
    const m = new MockAgentBackend({
      outcome: "done",
      filesToWrite: [{ path: "x.txt", content: "x" }],
    });
    const run = m.spawn("p", { cwd });
    const lines: string[] = [];
    for await (const line of run.stdoutLines) lines.push(line);
    await run.done;
    expect(lines).toContain("wrote x.txt");
    expect(lines).toContain("ARCHITEXT_DONE");
  });
});
```

- [ ] **Step 2: Implement** `packages/cli/src/agent/mock.ts`:

```typescript
/**
 * @module @architext/cli/agent/mock
 * Concepts: [[MockAgentBackend]], [[TestDouble]]
 * Spec: §5.4 Agent backends — implementation of the AgentBackend interface for tests
 * Depends on: [[backend]] (AgentBackend, AgentRun), node:fs, node:path
 * Consumed by: tests, [[commands/apply]] tests
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AgentBackend, AgentRun, AgentRunResult } from "./backend";

export interface MockAgentConfig {
  outcome: "done" | "failed" | "crashed";
  installed?: boolean;
  filesToWrite?: { path: string; content: string }[];
  failureReason?: string;
  stderrTail?: string;
}

export class MockAgentBackend implements AgentBackend {
  readonly name = "mock";

  constructor(private readonly cfg: MockAgentConfig) {}

  async isInstalled(): Promise<boolean> {
    return this.cfg.installed ?? true;
  }

  spawn(_prompt: string, opts: { cwd: string }): AgentRun {
    const lines: string[] = [];
    let result: AgentRunResult;

    if (this.cfg.outcome === "done") {
      const files = this.cfg.filesToWrite ?? [];
      for (const f of files) {
        const full = resolve(opts.cwd, f.path);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, f.content);
        lines.push(`wrote ${f.path}`);
      }
      lines.push("ARCHITEXT_DONE");
      result = { kind: "done", filesWritten: files.length };
    } else if (this.cfg.outcome === "failed") {
      const reason = this.cfg.failureReason ?? "unspecified";
      lines.push(`ARCHITEXT_FAILED ${reason}`);
      result = { kind: "failed", reason };
    } else {
      result = { kind: "crashed", stderrTail: this.cfg.stderrTail ?? "" };
    }

    return {
      done: Promise.resolve(result),
      stdoutLines: (async function* () {
        for (const ln of lines) yield ln;
      })(),
    };
  }
}
```

- [ ] **Step 3: Re-export from `index.ts`**:

```typescript
/**
 * @module @architext/cli/index
 * Concepts: [[CliPublicAPI]], [[Barrel]], [[ProgrammaticAPI]]
 * Spec: §5 CLI & Agent Handoff — exported for embedding & tests
 * Depends on: [[cli]], [[errors]], [[agent/backend]]
 * Consumed by: tests, future programmatic consumers
 */

export * from "./errors";
export * from "./prompt/load";
export * from "./prompt/build";
export * from "./agent/backend";
export * from "./agent/mock";
```

- [ ] **Step 4: Run tests + typecheck**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli test
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli run typecheck
```
Expected: 16 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/agent/mock.ts packages/cli/src/index.ts packages/cli/tests/agent-mock.test.ts
git commit -m "feat(cli): add MockAgentBackend for tests"
```

---

## Task 8: Backend selector

**Files:**
- Create: `packages/cli/src/agent/select.ts`
- Create: `packages/cli/tests/agent-select.test.ts`
- Modify: `packages/cli/src/index.ts`

`selectBackend(name)` returns a fresh backend instance. v1 supports `"claude-code"` (default) and `"mock"` (test-only). `"archon"` is reserved but throws "not yet implemented."

- [ ] **Step 1: Write the failing test** at `packages/cli/tests/agent-select.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { selectBackend } from "../src/agent/select";
import { ApplyError, ExitCode } from "../src/errors";

describe("selectBackend", () => {
  it("returns a claude-code backend by default", () => {
    const b = selectBackend("claude-code");
    expect(b.name).toBe("claude-code");
  });

  it("returns a mock backend when requested", () => {
    const b = selectBackend("mock");
    expect(b.name).toBe("mock");
  });

  it("throws ApplyError(Generic) for archon (reserved, not yet implemented)", () => {
    let caught: unknown;
    try {
      selectBackend("archon");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApplyError);
    expect((caught as ApplyError).code).toBe(ExitCode.Generic);
    expect((caught as ApplyError).message).toMatch(/archon/i);
    expect((caught as ApplyError).message).toMatch(/not.*implemented/i);
  });

  it("throws ApplyError(Generic) for unknown names", () => {
    let caught: unknown;
    try {
      selectBackend("gemini");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApplyError);
    expect((caught as ApplyError).code).toBe(ExitCode.Generic);
    expect((caught as ApplyError).message).toMatch(/gemini/);
  });
});
```

- [ ] **Step 2: Implement** `packages/cli/src/agent/select.ts`:

```typescript
/**
 * @module @architext/cli/agent/select
 * Concepts: [[BackendFactory]], [[Selector]]
 * Spec: §5.4 Agent backends — name-based dispatch
 * Depends on: [[backend]], [[mock]], [[claude-code]], [[errors]]
 * Consumed by: [[commands/apply]]
 */

import type { AgentBackend } from "./backend";
import { MockAgentBackend } from "./mock";
import { ClaudeCodeBackend } from "./claude-code";
import { ApplyError, ExitCode } from "../errors";

export function selectBackend(name: string): AgentBackend {
  switch (name) {
    case "claude-code":
      return new ClaudeCodeBackend();
    case "mock":
      return new MockAgentBackend({ outcome: "done" });
    case "archon":
      throw new ApplyError(
        ExitCode.Generic,
        "agent backend 'archon' is reserved but not yet implemented in this version"
      );
    default:
      throw new ApplyError(ExitCode.Generic, `unknown agent backend: ${name}`);
  }
}
```

- [ ] **Step 3: Stub** `packages/cli/src/agent/claude-code.ts` (filled in for real in Task 11):

```typescript
/**
 * @module @architext/cli/agent/claude-code
 * Concepts: [[ClaudeCodeBackend]], [[Subprocess]]
 * Spec: §5.4 Agent backends — claude-code default
 * Depends on: [[backend]], node:child_process
 * Consumed by: [[agent/select]], [[commands/apply]]
 */

import type { AgentBackend, AgentRun } from "./backend";
import { ApplyError, ExitCode } from "../errors";

export class ClaudeCodeBackend implements AgentBackend {
  readonly name = "claude-code";

  // Filled in for real in Task 11.
  async isInstalled(): Promise<boolean> {
    return false;
  }

  spawn(_prompt: string, _opts: { cwd: string }): AgentRun {
    throw new ApplyError(
      ExitCode.AgentNotInstalled,
      "ClaudeCodeBackend.spawn not yet implemented (Task 11)"
    );
  }
}
```

- [ ] **Step 4: Re-export** from `index.ts`:

```typescript
/**
 * @module @architext/cli/index
 * Concepts: [[CliPublicAPI]], [[Barrel]], [[ProgrammaticAPI]]
 * Spec: §5 CLI & Agent Handoff — exported for embedding & tests
 * Depends on: [[cli]], [[errors]], [[agent/backend]]
 * Consumed by: tests, future programmatic consumers
 */

export * from "./errors";
export * from "./prompt/load";
export * from "./prompt/build";
export * from "./agent/backend";
export * from "./agent/mock";
export * from "./agent/claude-code";
export * from "./agent/select";
```

- [ ] **Step 5: Run tests + typecheck**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli test
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli run typecheck
```
Expected: 20 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/agent/select.ts packages/cli/src/agent/claude-code.ts packages/cli/src/index.ts packages/cli/tests/agent-select.test.ts
git commit -m "feat(cli): add backend selector with claude-code stub and mock"
```

---

## Task 9: Status bar

**Files:**
- Create: `packages/cli/src/status.ts`
- Create: `packages/cli/tests/status.test.ts`
- Modify: `packages/cli/src/index.ts`

The status bar renders a single-line in-place tail counter (`Architext · my-app · claude-code · 12 files written · 1m23s`). For testability, the class accepts a `write(s)` function instead of touching `process.stdout` directly.

- [ ] **Step 1: Write the failing test** at `packages/cli/tests/status.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { StatusBar } from "../src/status";

describe("StatusBar", () => {
  it("renders status lines via the write callback", () => {
    const out: string[] = [];
    const bar = new StatusBar({ write: (s) => out.push(s), now: () => 0 });
    bar.start({ project: "my-app", agent: "claude-code" });
    bar.update({ filesWritten: 3, elapsedMs: 0 });
    bar.stop();
    expect(out.some((s) => s.includes("my-app"))).toBe(true);
    expect(out.some((s) => s.includes("3 files written"))).toBe(true);
    expect(out.some((s) => s.includes("claude-code"))).toBe(true);
  });

  it("formats elapsed time as HH:MM:SS or MM:SS or Ns", () => {
    const out: string[] = [];
    const bar = new StatusBar({ write: (s) => out.push(s), now: () => 0 });
    bar.start({ project: "p", agent: "mock" });
    bar.update({ filesWritten: 1, elapsedMs: 4_500 });
    bar.update({ filesWritten: 1, elapsedMs: 65_000 });
    bar.update({ filesWritten: 1, elapsedMs: 3_725_000 });
    bar.stop();
    const joined = out.join("\n");
    expect(joined).toContain("4s");
    expect(joined).toContain("1m05s");
    expect(joined).toContain("1h02m05s");
  });

  it("emits an ANSI clear sequence on stop", () => {
    const out: string[] = [];
    const bar = new StatusBar({ write: (s) => out.push(s), now: () => 0 });
    bar.start({ project: "p", agent: "mock" });
    bar.stop();
    // Last write should clear the line.
    expect(out.some((s) => s.includes("\x1b[2K"))).toBe(true);
  });
});
```

- [ ] **Step 2: Implement** `packages/cli/src/status.ts`:

```typescript
/**
 * @module @architext/cli/status
 * Concepts: [[StatusBar]], [[ANSI]], [[InPlaceRender]]
 * Spec: §5.5 Output / progress UX
 * Depends on: none (pure rendering)
 * Consumed by: [[commands/apply]]
 */

export interface StatusBarOptions {
  write: (s: string) => void;
  now?: () => number;
}

export interface StatusBarStartOpts {
  project: string;
  agent: string;
}

export interface StatusBarUpdateOpts {
  filesWritten: number;
  elapsedMs: number;
}

const ANSI_CLEAR = "\x1b[2K\r";

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m${sec.toString().padStart(2, "0")}s`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m.toString().padStart(2, "0")}m${sec.toString().padStart(2, "0")}s`;
}

export class StatusBar {
  private project = "";
  private agent = "";
  private active = false;

  constructor(private readonly opts: StatusBarOptions) {}

  start(s: StatusBarStartOpts): void {
    this.project = s.project;
    this.agent = s.agent;
    this.active = true;
    this.opts.write(this.render(0, 0));
  }

  update(u: StatusBarUpdateOpts): void {
    if (!this.active) return;
    this.opts.write(ANSI_CLEAR);
    this.opts.write(this.render(u.filesWritten, u.elapsedMs));
  }

  stop(): void {
    if (!this.active) return;
    this.opts.write(ANSI_CLEAR);
    this.active = false;
  }

  private render(filesWritten: number, elapsedMs: number): string {
    const elapsed = formatElapsed(elapsedMs);
    return `Architext · ${this.project} · ${this.agent} · ${filesWritten} files written · ${elapsed}`;
  }
}
```

- [ ] **Step 3: Re-export from `index.ts`**:

```typescript
/**
 * @module @architext/cli/index
 * Concepts: [[CliPublicAPI]], [[Barrel]], [[ProgrammaticAPI]]
 * Spec: §5 CLI & Agent Handoff — exported for embedding & tests
 * Depends on: [[cli]], [[errors]], [[agent/backend]]
 * Consumed by: tests, future programmatic consumers
 */

export * from "./errors";
export * from "./prompt/load";
export * from "./prompt/build";
export * from "./agent/backend";
export * from "./agent/mock";
export * from "./agent/claude-code";
export * from "./agent/select";
export * from "./status";
```

- [ ] **Step 4: Run tests + typecheck**

Expected: 23 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/status.ts packages/cli/src/index.ts packages/cli/tests/status.test.ts
git commit -m "feat(cli): add StatusBar with elapsed-time formatting"
```

---

## Task 10: `validate` command

**Files:**
- Create: `packages/cli/src/commands/validate.ts`
- Create: `packages/cli/tests/cmd-validate.test.ts`
- Modify: `packages/cli/src/index.ts`

`runValidate({ specPath, write })` reads a JSON file, parses it through `ArchitextSpecSchema`, returns an `ExitCode`. The `write` callback receives output lines (so tests can inspect them; the bin wrapper passes `console.log`).

- [ ] **Step 1: Write the failing test** at `packages/cli/tests/cmd-validate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runValidate } from "../src/commands/validate";
import { ExitCode } from "../src/errors";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-validate-"));
}

const validSpec = {
  schemaVersion: "0.1.0",
  project: { name: "T", slug: "t" },
  groups: [],
  services: [],
  edges: [],
};

describe("runValidate", () => {
  it("returns Success and prints OK for a valid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const out: string[] = [];
    const code = await runValidate({ specPath: p, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.Success);
    expect(out.join("\n")).toMatch(/valid/i);
  });

  it("returns SpecInvalid and prints offending field for a schema-invalid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify({ ...validSpec, schemaVersion: "9.9.9" }));
    const out: string[] = [];
    const code = await runValidate({ specPath: p, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.SpecInvalid);
    expect(out.join("\n")).toContain("schemaVersion");
  });

  it("returns SpecInvalid for malformed JSON", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, "{ not json");
    const out: string[] = [];
    const code = await runValidate({ specPath: p, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.SpecInvalid);
    expect(out.join("\n")).toMatch(/parse|json/i);
  });

  it("returns Generic if file does not exist", async () => {
    const out: string[] = [];
    const code = await runValidate({ specPath: "/no/such/file.json", write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.Generic);
    expect(out.join("\n")).toMatch(/not found|enoent/i);
  });
});
```

- [ ] **Step 2: Implement** `packages/cli/src/commands/validate.ts`:

```typescript
/**
 * @module @architext/cli/commands/validate
 * Concepts: [[ValidateCommand]], [[SchemaCheck]]
 * Spec: §5.1 — `architext validate`; §5.6 exit codes 1, 2
 * Depends on: [[@architext/schema]] (ArchitextSpecSchema), [[errors]]
 * Consumed by: [[cli]]
 */

import { readFileSync } from "node:fs";
import { ArchitextSpecSchema } from "@architext/schema";
import { ExitCode, formatZodError } from "../errors";

export interface ValidateOpts {
  specPath: string;
  write: (s: string) => void;
}

export async function runValidate(opts: ValidateOpts): Promise<ExitCode> {
  let raw: string;
  try {
    raw = readFileSync(opts.specPath, "utf-8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      opts.write(`spec not found: ${opts.specPath}`);
    } else {
      opts.write(`could not read spec: ${e.message}`);
    }
    return ExitCode.Generic;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    opts.write(`could not parse spec as JSON: ${(err as Error).message}`);
    return ExitCode.SpecInvalid;
  }

  const result = ArchitextSpecSchema.safeParse(json);
  if (!result.success) {
    opts.write("spec failed schema validation:");
    opts.write(formatZodError(result.error));
    return ExitCode.SpecInvalid;
  }

  opts.write(`spec is valid: ${result.data.project.slug} (schemaVersion ${result.data.schemaVersion})`);
  return ExitCode.Success;
}
```

- [ ] **Step 3: Re-export from `index.ts`** (add at the bottom):

```typescript
export * from "./commands/validate";
```

- [ ] **Step 4: Run tests + typecheck**

Expected: 27 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/validate.ts packages/cli/src/index.ts packages/cli/tests/cmd-validate.test.ts
git commit -m "feat(cli): add validate command"
```

---

## Task 11: `init` command

**Files:**
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/tests/cmd-init.test.ts`
- Modify: `packages/cli/src/index.ts`

`runInit({ projectName, cwd, write })` writes `<cwd>/spec.json` containing a minimal valid spec. `projectName` is optional; default is `"my-app"`.

- [ ] **Step 1: Write the failing test** at `packages/cli/tests/cmd-init.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInit } from "../src/commands/init";
import { ExitCode } from "../src/errors";
import { ArchitextSpecSchema } from "@architext/schema";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-init-"));
}

describe("runInit", () => {
  it("writes a valid minimal spec.json with the given project name", async () => {
    const dir = tmp();
    const out: string[] = [];
    const code = await runInit({ projectName: "my-cool-app", cwd: dir, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.Success);
    const path = resolve(dir, "spec.json");
    expect(existsSync(path)).toBe(true);
    const parsed = ArchitextSpecSchema.safeParse(JSON.parse(readFileSync(path, "utf-8")));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.project.slug).toBe("my-cool-app");
      expect(parsed.data.project.name).toBe("my-cool-app");
    }
  });

  it("defaults projectName to 'my-app'", async () => {
    const dir = tmp();
    const code = await runInit({ cwd: dir, write: () => {} });
    expect(code).toBe(ExitCode.Success);
    const parsed = JSON.parse(readFileSync(resolve(dir, "spec.json"), "utf-8"));
    expect(parsed.project.slug).toBe("my-app");
  });

  it("refuses to overwrite an existing spec.json", async () => {
    const dir = tmp();
    writeFileSync(resolve(dir, "spec.json"), "existing content");
    const out: string[] = [];
    const code = await runInit({ cwd: dir, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.TargetExists);
    expect(out.join("\n")).toMatch(/already exists/i);
    // Existing content preserved.
    expect(readFileSync(resolve(dir, "spec.json"), "utf-8")).toBe("existing content");
  });

  it("rejects non-slug-safe project names", async () => {
    const dir = tmp();
    const out: string[] = [];
    const code = await runInit({ projectName: "Has Spaces!", cwd: dir, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.SpecInvalid);
    expect(out.join("\n")).toMatch(/slug|kebab/i);
  });
});
```

- [ ] **Step 2: Implement** `packages/cli/src/commands/init.ts`:

```typescript
/**
 * @module @architext/cli/commands/init
 * Concepts: [[InitCommand]], [[MinimalSpec]]
 * Spec: §5.1 — `architext init [project-name]`
 * Depends on: [[@architext/schema]], [[errors]]
 * Consumed by: [[cli]]
 */

import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ArchitextSpecSchema, SCHEMA_VERSION } from "@architext/schema";
import { ExitCode, formatZodError } from "../errors";

export interface InitOpts {
  projectName?: string;
  cwd: string;
  write: (s: string) => void;
}

export async function runInit(opts: InitOpts): Promise<ExitCode> {
  const name = opts.projectName ?? "my-app";

  const spec = {
    schemaVersion: SCHEMA_VERSION,
    project: { name, slug: name },
    groups: [],
    services: [],
    edges: [],
  };

  const result = ArchitextSpecSchema.safeParse(spec);
  if (!result.success) {
    opts.write(`could not initialize spec for project name "${name}":`);
    opts.write(formatZodError(result.error));
    return ExitCode.SpecInvalid;
  }

  const target = resolve(opts.cwd, "spec.json");
  if (existsSync(target)) {
    opts.write(`spec.json already exists at ${target}; refusing to overwrite`);
    return ExitCode.TargetExists;
  }

  writeFileSync(target, JSON.stringify(result.data, null, 2) + "\n");
  opts.write(`wrote ${target}`);
  return ExitCode.Success;
}
```

- [ ] **Step 3: Re-export from `index.ts`** (add):

```typescript
export * from "./commands/init";
```

- [ ] **Step 4: Run tests + typecheck**

Expected: 31 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/init.ts packages/cli/src/index.ts packages/cli/tests/cmd-init.test.ts
git commit -m "feat(cli): add init command"
```

---

## Task 12: `apply` command (full pipeline)

**Files:**
- Create: `packages/cli/src/commands/apply.ts`
- Create: `packages/cli/tests/cmd-apply.test.ts`
- Modify: `packages/cli/src/index.ts`

`runApply` wires every piece together: read spec → validate → load meta-prompt → build full prompt → resolve target dir → spawn backend → consume stdout → return exit code. Pre-flight checks include "agent installed", "target dir doesn't exist (or `--force`)", "CWD writable".

- [ ] **Step 1: Write the failing test** at `packages/cli/tests/cmd-apply.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runApply } from "../src/commands/apply";
import { ExitCode } from "../src/errors";
import { MockAgentBackend } from "../src/agent/mock";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-apply-"));
}

const validSpec = {
  schemaVersion: "0.1.0",
  project: { name: "Smoke", slug: "smoke" },
  groups: [],
  services: [],
  edges: [],
};

function writeSpec(dir: string): string {
  const p = resolve(dir, "spec.json");
  writeFileSync(p, JSON.stringify(validSpec));
  return p;
}

describe("runApply", () => {
  it("dry-run prints the assembled prompt and returns Success", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      dryRun: true,
      backend: new MockAgentBackend({ outcome: "done" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.Success);
    const joined = out.join("\n");
    expect(joined).toContain("# Architext Scaffold Prompt v0.1.0");
    expect(joined).toContain('"slug": "smoke"');
  });

  it("returns SpecInvalid for an invalid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify({ ...validSpec, schemaVersion: "9.9.9" }));
    const out: string[] = [];
    const code = await runApply({
      specPath: p,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "done" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.SpecInvalid);
  });

  it("returns AgentNotInstalled when the backend reports false", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "done", installed: false }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.AgentNotInstalled);
  });

  it("returns TargetExists if <cwd>/<slug>/ exists and --force is not set", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const target = resolve(dir, "smoke");
    require("node:fs").mkdirSync(target);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "done" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.TargetExists);
    expect(out.join("\n")).toMatch(/already exists/i);
  });

  it("succeeds end-to-end with mock backend, writing files to <cwd>/<slug>/", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({
        outcome: "done",
        filesToWrite: [
          { path: "README.md", content: "# Smoke" },
          { path: "package.json", content: "{}" },
        ],
      }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.Success);
    const target = resolve(dir, "smoke");
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(resolve(target, "README.md"), "utf-8")).toBe("# Smoke");
  });

  it("returns AgentFailedSentinel when backend resolves with kind=failed", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "failed", failureReason: "test failure" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.AgentFailedSentinel);
    expect(out.join("\n")).toContain("test failure");
  });

  it("returns AgentCrashed when backend resolves with kind=crashed", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "crashed", stderrTail: "oops" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.AgentCrashed);
    expect(out.join("\n")).toContain("oops");
  });
});
```

- [ ] **Step 2: Implement** `packages/cli/src/commands/apply.ts`:

```typescript
/**
 * @module @architext/cli/commands/apply
 * Concepts: [[ApplyCommand]], [[Pipeline]], [[Orchestrator]]
 * Spec: §5.2 apply pipeline
 * Depends on: [[@architext/schema]], [[errors]], [[prompt/load]], [[prompt/build]], [[agent/backend]]
 * Consumed by: [[cli]]
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ArchitextSpecSchema } from "@architext/schema";
import { ExitCode, formatZodError } from "../errors";
import { loadMetaPrompt } from "../prompt/load";
import { buildPrompt } from "../prompt/build";
import type { AgentBackend } from "../agent/backend";

export interface ApplyOpts {
  specPath: string;
  cwd: string;
  backend: AgentBackend;
  instructions?: string;
  dryRun?: boolean;
  force?: boolean;
  write: (s: string) => void;
}

export async function runApply(opts: ApplyOpts): Promise<ExitCode> {
  // 1. Read & parse spec.
  let raw: string;
  try {
    raw = readFileSync(opts.specPath, "utf-8");
  } catch (err) {
    opts.write(`could not read spec: ${(err as Error).message}`);
    return ExitCode.Generic;
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    opts.write(`could not parse spec as JSON: ${(err as Error).message}`);
    return ExitCode.SpecInvalid;
  }
  const parsed = ArchitextSpecSchema.safeParse(json);
  if (!parsed.success) {
    opts.write("spec failed schema validation:");
    opts.write(formatZodError(parsed.error));
    return ExitCode.SpecInvalid;
  }
  const spec = parsed.data;

  // 2. Load meta-prompt and assemble final prompt.
  let meta: string;
  try {
    meta = loadMetaPrompt(spec.schemaVersion);
  } catch (err) {
    opts.write((err as Error).message);
    return ExitCode.SpecInvalid;
  }
  const fullPrompt = buildPrompt(meta, spec, opts.instructions);

  // 3. Dry-run short-circuit.
  if (opts.dryRun === true) {
    opts.write(fullPrompt);
    return ExitCode.Success;
  }

  // 4. Pre-flight: backend installed.
  const installed = await opts.backend.isInstalled();
  if (!installed) {
    opts.write(
      `agent backend "${opts.backend.name}" is not installed or not on PATH. ` +
        `See README for install instructions.`
    );
    return ExitCode.AgentNotInstalled;
  }

  // 5. Resolve & prepare target directory.
  const target = resolve(opts.cwd, spec.project.slug);
  if (existsSync(target) && opts.force !== true) {
    opts.write(
      `target directory already exists: ${target}. Pass --force to overwrite.`
    );
    return ExitCode.TargetExists;
  }
  mkdirSync(target, { recursive: true });

  // 6. Spawn backend.
  const run = opts.backend.spawn(fullPrompt, { cwd: target });

  // 7. Stream stdout lines through the write callback.
  (async () => {
    for await (const line of run.stdoutLines) opts.write(line);
  })().catch((err) => opts.write(`stdout stream error: ${(err as Error).message}`));

  // 8. Await result and translate to exit code.
  const result = await run.done;
  switch (result.kind) {
    case "done":
      opts.write(
        `✓ created ${target} (${result.filesWritten} files written via ${opts.backend.name})`
      );
      return ExitCode.Success;
    case "failed":
      opts.write(`agent ended with ARCHITEXT_FAILED: ${result.reason}`);
      return ExitCode.AgentFailedSentinel;
    case "crashed":
      opts.write(`agent crashed mid-run. Last stderr lines:\n${result.stderrTail}`);
      return ExitCode.AgentCrashed;
  }
}
```

- [ ] **Step 3: Re-export from `index.ts`** (add):

```typescript
export * from "./commands/apply";
```

- [ ] **Step 4: Run tests + typecheck**

Expected: 38 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/apply.ts packages/cli/src/index.ts packages/cli/tests/cmd-apply.test.ts
git commit -m "feat(cli): add apply command with full pipeline (mock backend integration)"
```

---

## Task 13: `ClaudeCodeBackend` (real subprocess)

**Files:**
- Modify: `packages/cli/src/agent/claude-code.ts`

The real backend spawns the `claude` CLI in non-interactive mode, pipes the prompt into stdin, and watches stdout for the `ARCHITEXT_DONE` / `ARCHITEXT_FAILED` sentinels. We don't add unit tests for the live subprocess (that requires the `claude` binary on PATH); the integration test in Task 14 covers the wiring with the mock backend.

- [ ] **Step 1: Replace** the body of `packages/cli/src/agent/claude-code.ts` (header preserved):

```typescript
/**
 * @module @architext/cli/agent/claude-code
 * Concepts: [[ClaudeCodeBackend]], [[Subprocess]], [[Sentinels]]
 * Spec: §5.4 Agent backends — claude-code default
 * Depends on: [[backend]], node:child_process, node:readline
 * Consumed by: [[agent/select]], [[commands/apply]]
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { AgentBackend, AgentRun, AgentRunResult } from "./backend";

export class ClaudeCodeBackend implements AgentBackend {
  readonly name = "claude-code";

  async isInstalled(): Promise<boolean> {
    return new Promise((resolveBool) => {
      const proc = spawn("claude", ["--version"], { stdio: "ignore" });
      proc.on("error", () => resolveBool(false));
      proc.on("exit", (code) => resolveBool(code === 0));
    });
  }

  spawn(prompt: string, opts: { cwd: string }): AgentRun {
    const proc = spawn("claude", ["--print"], {
      cwd: opts.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stdin.write(prompt);
    proc.stdin.end();

    const stderrChunks: string[] = [];
    proc.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk.toString("utf-8"));
      // Keep only last ~50 lines worth.
      while (stderrChunks.join("").length > 8192) stderrChunks.shift();
    });

    let resolveLines!: (lines: AsyncIterable<string>) => void;
    const linesPromise: Promise<AsyncIterable<string>> = new Promise((r) => {
      resolveLines = r;
    });

    const linesIter = (async function* () {
      const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });
      for await (const line of rl) yield line;
    })();
    resolveLines(linesIter);
    void linesPromise; // keep variable to silence "unused" warnings under strict mode

    const done: Promise<AgentRunResult> = new Promise((resolveResult) => {
      let lastOutLines: string[] = [];
      const tap = createInterface({ input: proc.stdout, crlfDelay: Infinity });
      tap.on("line", (line) => {
        lastOutLines.push(line);
        if (lastOutLines.length > 200) lastOutLines.shift();
      });

      proc.on("error", () => {
        resolveResult({ kind: "crashed", stderrTail: stderrChunks.join("") });
      });
      proc.on("exit", (exitCode) => {
        // Look at the last output lines for sentinels.
        for (let i = lastOutLines.length - 1; i >= 0; i--) {
          const ln = lastOutLines[i] ?? "";
          if (ln.startsWith("ARCHITEXT_DONE")) {
            const filesWritten = lastOutLines.filter((l) => l.startsWith("wrote ")).length;
            resolveResult({ kind: "done", filesWritten });
            return;
          }
          if (ln.startsWith("ARCHITEXT_FAILED")) {
            const reason = ln.replace(/^ARCHITEXT_FAILED\s*/, "").trim();
            resolveResult({ kind: "failed", reason: reason.length > 0 ? reason : "unspecified" });
            return;
          }
        }
        if (exitCode !== 0) {
          resolveResult({ kind: "crashed", stderrTail: stderrChunks.join("") });
        } else {
          resolveResult({
            kind: "failed",
            reason: "agent exited cleanly without ARCHITEXT_DONE sentinel",
          });
        }
      });
    });

    return { done, stdoutLines: linesIter };
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli run typecheck
```
Expected: clean.

- [ ] **Step 3: Run tests** (existing tests should still pass — this task adds no new tests):

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli test
```
Expected: 38 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/agent/claude-code.ts
git commit -m "feat(cli): wire ClaudeCodeBackend to spawn claude subprocess"
```

---

## Task 14: Commander wiring (`runCli`) + bin entry

**Files:**
- Create: `packages/cli/src/cli.ts`
- Modify: `packages/cli/src/bin.ts`
- Modify: `packages/cli/src/index.ts`

`runCli(argv)` is the single integration point: it parses argv with Commander, dispatches to the right command, and returns an exit code. `bin.ts` is a 5-line wrapper that calls `runCli(process.argv).then((code) => process.exit(code))`.

- [ ] **Step 1: Implement** `packages/cli/src/cli.ts`:

```typescript
/**
 * @module @architext/cli/cli
 * Concepts: [[RunCli]], [[Commander]], [[Dispatcher]]
 * Spec: §5.1 Command surface
 * Depends on: commander, all [[commands/*]], [[agent/select]], [[errors]]
 * Consumed by: [[bin]] (entry), tests (programmatic)
 */

import { Command } from "commander";
import { runValidate } from "./commands/validate";
import { runInit } from "./commands/init";
import { runApply } from "./commands/apply";
import { selectBackend } from "./agent/select";
import { ApplyError, ExitCode } from "./errors";

const VERSION = "0.1.0";

export async function runCli(argv: readonly string[]): Promise<number> {
  const program = new Command();
  program
    .name("architext")
    .description("Apply an Architext spec to scaffold a project via an AI agent")
    .version(VERSION)
    .exitOverride();   // throw instead of process.exit on parse errors

  const write = (s: string) => process.stdout.write(s + "\n");

  let exitCode: ExitCode = ExitCode.Success;

  program
    .command("validate")
    .argument("<spec>", "path to spec.json")
    .action(async (spec: string) => {
      exitCode = await runValidate({ specPath: spec, write });
    });

  program
    .command("init")
    .argument("[name]", "project name (kebab-case)", "my-app")
    .action(async (name: string) => {
      exitCode = await runInit({ projectName: name, cwd: process.cwd(), write });
    });

  program
    .command("apply")
    .argument("<spec>", "path to spec.json")
    .option("-a, --agent <name>", "agent backend (claude-code|mock|archon)", "claude-code")
    .option("-i, --instructions <text>", "extra instructions appended to the prompt")
    .option("--dry-run", "print the assembled prompt and exit", false)
    .option("--force", "overwrite the target directory if it exists", false)
    .action(async (spec: string, opts: { agent: string; instructions?: string; dryRun: boolean; force: boolean }) => {
      try {
        const backend = selectBackend(opts.agent);
        exitCode = await runApply({
          specPath: spec,
          cwd: process.cwd(),
          backend,
          instructions: opts.instructions,
          dryRun: opts.dryRun,
          force: opts.force,
          write,
        });
      } catch (err) {
        if (err instanceof ApplyError) {
          write(err.message);
          exitCode = err.code;
        } else {
          write(`unexpected error: ${(err as Error).message}`);
          exitCode = ExitCode.Generic;
        }
      }
    });

  try {
    await program.parseAsync(Array.from(argv));
  } catch (err) {
    // Commander throws on unknown commands or --help/--version; --help/--version exit 0.
    const code = (err as { exitCode?: number; code?: string }).exitCode ?? 1;
    return code;
  }

  return exitCode;
}
```

- [ ] **Step 2: Replace** `packages/cli/src/bin.ts`:

```typescript
/**
 * @module @architext/cli/bin
 * Concepts: [[CliEntry]], [[Shebang]]
 * Spec: §5.1 Command surface — npx architext entry
 * Depends on: [[cli]] (runCli)
 * Consumed by: end users via `npx architext`
 */

import { runCli } from "./cli";

runCli(process.argv).then((code) => process.exit(code));
```

- [ ] **Step 3: Re-export from `index.ts`** (add):

```typescript
export * from "./cli";
```

- [ ] **Step 4: Typecheck + tests**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli run typecheck
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli test
```
Expected: typecheck clean. Existing 38 tests still pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/cli.ts packages/cli/src/bin.ts packages/cli/src/index.ts
git commit -m "feat(cli): wire commander dispatcher and bin entry point"
```

---

## Task 15: End-to-end integration test

**Files:**
- Create: `packages/cli/tests/integration.test.ts`

This is the smoke test: invoke `runCli` with synthetic argv against a real spec.json and the mock backend, assert exit code + filesystem effect. It exercises every layer except the live `claude` subprocess.

- [ ] **Step 1: Write the test** at `packages/cli/tests/integration.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCli } from "../src/cli";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-int-"));
}

const validSpec = {
  schemaVersion: "0.1.0",
  project: { name: "Integ", slug: "integ" },
  groups: [],
  services: [],
  edges: [],
};

describe("runCli (end-to-end)", () => {
  it("validate exits 0 for a valid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const code = await runCli(["node", "architext", "validate", p]);
    expect(code).toBe(0);
  });

  it("validate exits 2 for an invalid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify({ ...validSpec, schemaVersion: "9.9.9" }));
    const code = await runCli(["node", "architext", "validate", p]);
    expect(code).toBe(2);
  });

  it("init writes a valid spec.json in the current cwd", async () => {
    const dir = tmp();
    const oldCwd = process.cwd();
    try {
      process.chdir(dir);
      const code = await runCli(["node", "architext", "init", "my-test"]);
      expect(code).toBe(0);
      const written = JSON.parse(readFileSync(resolve(dir, "spec.json"), "utf-8"));
      expect(written.project.slug).toBe("my-test");
    } finally {
      process.chdir(oldCwd);
    }
  });

  it("apply --agent mock --dry-run prints the prompt and exits 0", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const oldCwd = process.cwd();
    try {
      process.chdir(dir);
      const code = await runCli([
        "node",
        "architext",
        "apply",
        p,
        "--agent",
        "mock",
        "--dry-run",
      ]);
      expect(code).toBe(0);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it("apply --agent mock writes files into <cwd>/<slug>/", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const oldCwd = process.cwd();
    try {
      process.chdir(dir);
      const code = await runCli([
        "node",
        "architext",
        "apply",
        p,
        "--agent",
        "mock",
      ]);
      expect(code).toBe(0);
      // The mock with default outcome writes 0 files but creates the target dir.
      expect(existsSync(resolve(dir, "integ"))).toBe(true);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it("apply with no --agent and no claude on PATH exits 3 (AgentNotInstalled)", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const oldCwd = process.cwd();
    const oldPath = process.env.PATH;
    try {
      process.chdir(dir);
      // Neutralize PATH so `claude` is not findable.
      process.env.PATH = "/nonexistent";
      const code = await runCli(["node", "architext", "apply", p]);
      expect(code).toBe(3);
    } finally {
      process.chdir(oldCwd);
      process.env.PATH = oldPath;
    }
  });
});
```

- [ ] **Step 2: Run tests**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli test
```
Expected: 38 prior + 6 new = 44 passing.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/tests/integration.test.ts
git commit -m "test(cli): add end-to-end integration tests via runCli"
```

---

## Task 16: Build, pack, and bin smoke test

**Files (verification only):**
- No file changes; verify build outputs.

- [ ] **Step 1: Build the package**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli build
```
Expected: `dist/index.js`, `dist/index.cjs`, `dist/bin.js`, `dist/bin.cjs`, `dist/index.d.ts`, plus `prompts/scaffold-v0.1.0.md` copied into `packages/cli/prompts/`.

- [ ] **Step 2: Verify the built bin works**

```bash
node packages/cli/dist/bin.js --version
```
Expected: `0.1.0`

```bash
node packages/cli/dist/bin.js --help
```
Expected: usage block listing `validate`, `init`, `apply`.

- [ ] **Step 3: Smoke `validate` against a fixture spec**

```bash
node packages/cli/dist/bin.js validate packages/schema/tests/fixtures/golden-frontend-backend-db.json
```
Expected: exit 0, prints `spec is valid: notes-app (schemaVersion 0.1.0)` (or similar).

- [ ] **Step 4: Smoke `init` in a temp dir**

```bash
TMP=$(mktemp -d) && (cd "$TMP" && node "$OLDPWD/packages/cli/dist/bin.js" init demo-app && cat spec.json) && rm -rf "$TMP"
```
Expected: prints a JSON spec with `slug: "demo-app"`.

- [ ] **Step 5: Pack and inspect tarball**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm --filter @architext/cli pack --pack-destination /tmp
tar -tzf /tmp/architext-cli-0.1.0.tgz | head -30
tar -tzf /tmp/architext-cli-0.1.0.tgz | grep -E "^package/(src|tests)/" && echo "FAIL: src/tests in tarball" || echo "OK: clean tarball"
tar -tzf /tmp/architext-cli-0.1.0.tgz | grep "package/prompts/scaffold-v0.1.0.md" && echo "OK: prompt shipped" || echo "FAIL: prompt missing"
rm /tmp/architext-cli-0.1.0.tgz
```
Expected: "OK: clean tarball" and "OK: prompt shipped".

- [ ] **Step 6: Repo-wide gates**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH" && pnpm test && pnpm build && pnpm typecheck
```
Expected: all green. Total tests: schema(67) + catalog(28) + patterns(20) + files-engine(23) + cli(44) = 182.

- [ ] **Step 7: No commit needed for verification-only steps.** If the `pnpm install` step in Task 1 added entries to root `package.json` that weren't committed earlier, commit them now:

```bash
git status
# If anything is staged: git commit -m "chore: tidy lockfile after CLI install"
```

---

## Self-Review Checklist (run after final commit)

- [ ] **Spec coverage:** §5.1 (command surface) → Tasks 10-12, 14. §5.2 (apply pipeline) → Task 12. §5.3 (meta-prompt) → Task 2. §5.4 (agent backends) → Tasks 6-8, 13. §5.5 (status bar) → Task 9. §5.6 (error handling exit codes) → Task 3.

- [ ] **Reserved-fields posture:** none of the v1.5+ reserved fields (`contracts`, `replicas`, `containerization`, `deployTarget`, `envTier`) appear in any CLI source or in the meta-prompt. Confirm:
  ```bash
  grep -nE "contracts|replicas|containerization|deployTarget|envTier" packages/cli/src prompts/scaffold-v0.1.0.md || echo "OK"
  ```

- [ ] **Type consistency:** `AgentBackend.spawn` returns `AgentRun` everywhere. `runApply`'s opts shape matches what `cli.ts` passes. `ExitCode` enum used uniformly.

- [ ] **No placeholders:** search the plan file for `TBD|TODO|FIXME|XXX` (excluding the meta-prompt's intentional ARCHITEXT_FAILED sentinel and the self-review checklist line itself).

- [ ] **Final state:** `pnpm install && pnpm test && pnpm build && pnpm typecheck` all succeed at HEAD.

---

## What This Plan Delivers

After completion of all 16 tasks:

- **`@architext/cli`** — a publishable CLI package with three commands (`validate`, `init`, `apply`), pluggable agent backends (`mock`, `claude-code`, `archon` reserved), full exit-code discipline, and an in-place ANSI status bar.
- **`prompts/scaffold-v0.1.0.md`** — the versioned meta-prompt that drives agent behavior. Per-ServiceKind and per-Protocol guidance is concrete, not stubbed.
- **44 new tests** — every module unit-tested, plus 6 end-to-end tests through `runCli` that exercise the full pipeline with the mock backend.
- **Total repo state**: 5 packages, 182 tests, all builds clean. The `npx architext` happy path is proven end-to-end with the mock agent; the live `claude` path is wired but only smoke-tested with `--version` (full agent runs are out of scope for unit tests).

This is the **agent-handoff bridge**. With this in place, Plan 4 (web app) can wire its "Apply…" button to surface the exact `npx architext apply ./spec.json` command, knowing the CLI will deterministically validate + load + assemble + spawn — and the canvas can finally close the loop from drag-and-drop to runnable repo.
