# Architext — Design Specification (PRD)

**Date:** 2026-05-02
**Status:** Approved design, pre-implementation
**Owner:** phetamine
**Schema version targeted:** `0.1.0`

---

## 1. Vision & Success Criteria

**Architext** is a web-based visual architecture editor that produces a structured JSON specification of a software system, then hands that spec to an AI coding agent (Claude Code or Archon) to scaffold the actual repository.

### Target user

Developers who use AI coding agents and want to express the *shape* of a project visually before generating it. Solo developers and small teams who prototype frequently and dislike rewriting the same boilerplate.

### Core value proposition

Compress the gap between "I have an idea for a system" and "I have a running, structured codebase." Today this gap is filled with manual scaffolding, copy-pasted templates, or long unstructured prompts to an agent. Architext replaces all three with a visual canvas and a deterministic JSON contract that agents consume.

### v1 success criteria

1. A user can build a 4-service architecture (frontend, backend, database, worker) with typed edges in **under 5 minutes**.
2. The exported JSON spec is the only artifact needed — no follow-up prompting required for the agent to produce a buildable repo.
3. **A single CLI command — `npx architext apply ./spec.json` — scaffolds the project into the user's current working directory.** The agent produces a runnable repo (each service runs with its standard local dev command — e.g., `npm run dev`, `uvicorn main:app --reload`) without human intervention, ≥80% of the time. Docker / `compose` integration is explicitly **deferred to v1.5+**.
4. The Spec tab updates in real time as the user edits; File tree shows accurate file structure within 200 ms; Code preview generates a single service in under 30 s.
5. The product runs in any modern browser without install. The CLI is one `npx architext` away.

### v1 explicit non-goals

- Real-time multi-user collaboration
- Contract-driven edges (deferred — see Section 4.3 "v1.5 path")
- Plugin system for community-authored components
- Cloud project save / shareable links
- In-app code editing
- Deployment management
- Docker / containerization

---

## 2. System Architecture

Architext is **three loosely-coupled pieces** that communicate through one canonical data structure (the JSON spec). The data structure is the contract; the three pieces are independent implementations of producers and consumers.

```
┌──────────────────────────────┐         ┌──────────────────────────┐
│   1. Web App (Canvas)        │         │   3. npx architext CLI   │
│   ─────────────────────      │         │   ──────────────────     │
│   • React SPA (browser)      │         │   • Node 20+ CLI         │
│   • Renders Group → Service  │  spec   │   • Reads spec.json      │
│     → Component hierarchy    │ ──────► │   • Validates schema     │
│   • Drag/drop, edges, panels │ (file)  │   • Builds meta-prompt   │
│   • Side panel: Spec/Files/  │         │   • Spawns agent         │
│     Code tabs                │         │     (claude code/archon) │
│   • IndexedDB persistence    │         │   • Streams agent output │
│   • Exports spec as JSON     │         │     to stdout            │
└──────────────────────────────┘         └──────────────────────────┘
              │                                     │
              │   ┌─────────────────────────────────┐
              └──►│   2. Architext Spec (JSON)       │
                  │   ────────────────────────       │
                  │   • Versioned schema             │
                  │   • Single source of truth       │
                  │   • Validated by JSON Schema     │
                  │   • Lives in @architext/schema   │
                  │     (shared npm package)         │
                  └──────────────────────────────────┘
```

### Boundaries and responsibilities

- **Web app** owns nothing outside the browser. It produces a spec; it never touches the filesystem. It can preview the file tree (using deterministic rules) and on-demand call the agent for code preview, but generation is not its job.
- **CLI** owns the filesystem and the agent invocation. Intentionally small (target: <500 LOC). Single responsibility: read a spec, render a meta-prompt, spawn the agent in the user's CWD. Only piece that knows how to talk to claude code or archon.
- **Spec package** (`@architext/schema`) is published as a tiny npm package consumed by both the web app and the CLI. Contains JSON Schema, TypeScript types, Zod runtime validator. Both producers and consumers import from this same package — drift is structurally impossible.
- **Meta-prompt** lives inside the CLI repo as a versioned text file (`prompts/scaffold-v0.1.0.md`), referenced by spec version. Diffable, reviewable, testable.

### v1 deployment surface

- Web app — primary mode is **local dev** (`pnpm dev` → `localhost:5173`); optional deploy to **Railway** for sharing.
- `@architext/cli` — published to npm, run via `npx`.
- `@architext/schema` — published to npm, consumed by both.

No backend. Zero application server logic in v1. All persistence is local IndexedDB. Operating cost is $0 for local; Railway free tier covers shared deploys.

---

## 3. JSON Spec Schema

The spec is the product. Everything else is a producer or consumer of it.

### Top-level shape

```typescript
interface ArchitextSpec {
  schemaVersion: "0.1.0";        // semver of the schema itself
  project: ProjectMeta;
  groups: Group[];
  services: Service[];
  edges: Edge[];
}

interface ProjectMeta {
  name: string;                  // human-readable, e.g. "My App"
  slug: string;                  // URL/dir-safe, e.g. "my-app"
  description?: string;
  defaultBranch?: string;        // "main"
  // reserved for v1.5+: containerization, license, deploymentTarget
}
```

### Groups — optional logical containers

```typescript
interface Group {
  id: string;                    // stable id (uuid or slug-form)
  name: string;                  // "Backend Services"
  kind: GroupKind;
  serviceIds: string[];          // children
  position: Position;            // top-left on canvas
  size: Size;                    // dimensions on canvas
  network?: "public" | "private" | "internal";
  // reserved for v1.5+: deployTarget, envTier
}

type GroupKind =
  | "frontend" | "backend" | "data" | "workers"
  | "external" | "sidecars" | "custom";
```

### Services — the deployable unit

```typescript
interface Service {
  id: string;
  name: string;                  // "api", "web", "worker"
  kind: ServiceKind;
  groupId?: string;              // optional parent group
  position: Position;            // absolute on canvas (or relative to group)
  components: Component[];
  // reserved for v1.5+: contracts { exposes, consumes }, replicas
}

type ServiceKind =
  | "frontend-app"               // browser/native UI
  | "backend-service"            // API server
  | "worker"                     // background processor
  | "database"                   // persistent store
  | "cache"                      // ephemeral kv
  | "queue"                      // message broker
  | "sidecar"                    // observability/aux
  | "external-api";              // 3rd-party integration the project depends on
```

### Components — chips inside a service

```typescript
interface Component {
  id: string;                    // catalog id, e.g. "react", "fastapi"
  category: ComponentCategory;
  version?: string;              // optional pin, e.g. "^18.0.0"
  config?: Record<string, unknown>;   // catalog-defined per-component fields
}

type ComponentCategory =
  | "language"                   // typescript, python, go
  | "runtime"                    // node, bun, deno
  | "framework"                  // next, express, django
  | "library"                    // react, axios
  | "build-tool"                 // vite, webpack
  | "datastore"                  // postgres, redis (when used as a Component inside a Service)
  | "auth"                       // auth.js, clerk
  | "entry-point";               // user-defined start function
```

### Edges — typed connections (discriminated union)

```typescript
type Edge =
  | { id: string; from: string; to: string;
      protocol: "http"; port?: number; basePath?: string }
  | { id: string; from: string; to: string;
      protocol: "graphql"; port?: number; path?: string }
  | { id: string; from: string; to: string;
      protocol: "grpc"; port?: number }
  | { id: string; from: string; to: string;
      protocol: "websocket"; port?: number; path?: string }
  | { id: string; from: string; to: string;
      protocol: "queue"; topicName: string; broker?: string }
  | { id: string; from: string; to: string;
      protocol: "sql"; database?: string; port?: number }
  | { id: string; from: string; to: string;
      protocol: "key-value"; namespace?: string }
  | { id: string; from: string; to: string;
      protocol: "fs"; mountPath?: string };

interface Position { x: number; y: number; }
interface Size { width: number; height: number; }
```

### Schema design decisions

1. **`schemaVersion` is mandatory and semver-strict.** The CLI refuses specs whose schema version it can't handle. Lets the schema evolve without breaking older specs in the wild.
2. **Edges are a discriminated union on `protocol`.** TypeScript and Zod both narrow config fields based on protocol — `http` edge can't accidentally have `topicName`.
3. **Position/size lives in the spec.** A user opens an existing `spec.json` and sees their canvas exactly as they left it. Layout is part of the contract, intentional.
4. **Catalog ids, not freeform names.** `"id": "react"` not `"name": "React"`. The catalog (Section 7) is the source of truth.
5. **Reserved fields documented but absent from v1.** `contracts`, `containerization`, `replicas`, `deployTarget`. When v1.5 lands, adding them is a minor version bump (0.2.0) and the CLI handles both versions side-by-side.
6. **Validation at three boundaries:** on canvas mutation (Zod), on export (refuses invalid spec download), on CLI read (refuses to apply, prints offending path).

### v1.5 path

- **Contracts** (Q3 option C from brainstorming): services declare `exposes: Contract[]` and `consumes: ContractRef[]`. Edges become inferable from contract matching.
- **Containerization**: `project.containerization` block + per-service `dockerfile` overrides + a top-level `compose.yaml` generation pass.

These are reserved in the schema but not implemented in v1.

---

## 4. Canvas UX & Interaction Rules

### 4.1 Layout — three regions

```
┌──────────────────────────────────────────────────────────────┐
│  Top bar:  [Project name]  [Export]  [Apply…]  [Settings]    │
├──────────┬──────────────────────────────────────┬────────────┤
│          │                                      │            │
│  Palette │           Canvas                     │  Side      │
│  (rail)  │                                      │  Panel     │
│          │   ┌─────────────────────┐            │            │
│  ◉ 🏗️   │   │  Backend Group      │            │  ┌──────┐ │
│  ◉ 💬   │   │  ┌──────┐  ┌──────┐ │            │  │ Spec │ │
│  ◉ ⚙️   │   │  │ api  │──│ auth │ │            │  │Files │ │
│  ◉ 🎨   │   │  └──────┘  └──────┘ │            │  │ Code │ │
│  ◉ 📚   │   └─────────────────────┘            │  └──────┘ │
│  ◉ 💾   │                                      │            │
│  ◉ 🛠️   │                                      │  inspector │
│  ◉ 🔐   │                                      │            │
│  ◉ ▶️   │                                      │            │
└──────────┴──────────────────────────────────────┴────────────┘
```

### 4.2 Palette — two-stage browser

The palette is a compact rail (always visible) plus an expanded category panel that opens on click. The rail icons map to top-level categories; the expanded panel shows all options in that category, draggable to the canvas.

Categories (top to bottom):

1. **Architecture** — composite patterns (e.g., "REST API + DB", "Worker + Queue") that drop multiple pre-wired Services and Edges in one go, plus the basic Frame types (Group / Service tokens by kind)
2. **Languages** — TypeScript, Python, Go, etc.
3. **Frameworks** — Next.js, FastAPI, Django, Express, NestJS, SvelteKit, etc.
4. **Libraries** — React, Vue, Svelte, TanStack Query, Prisma, SQLAlchemy, axios, etc.
5. **Build tools** — Vite, Webpack, esbuild, Turbopack
6. **Datastores** — Postgres, MySQL, MongoDB, Redis, RabbitMQ, Kafka, etc. (these are *Service*-creating tokens)
7. **Auth** — Auth.js, Clerk, Lucia, Supabase Auth, JWT primitives
8. **Entry points** — `main()`, HTTP route, scheduled job, queue consumer

Behavior:

- Rail icons always visible; tooltips on hover.
- Clicking a rail icon opens the expanded panel beside it. Panel **stays open** during drag.
- Expanded panel: search box on top, then options (sub-grouped if needed). Each option is a draggable card with name, one-line description, compatibility indicators.
- Clicking a different rail icon swaps panel content. Clicking the same icon again (or pressing Escape) closes the panel.

### 4.3 Drop rules — strict by design

| From the palette | Drop target | Result |
|---|---|---|
| **Group token** | Empty canvas | Creates a new Group node |
| **Group token** | Inside an existing Group | ❌ rejected (no group nesting in v1) |
| **Service token** | Empty canvas | Creates a top-level Service |
| **Service token** | Inside a Group | Creates Service as child of that Group |
| **Service token** | Inside a Service | ❌ rejected |
| **Component chip** | Inside a Service | Adds the Component to that Service |
| **Component chip** | Inside a Group (not a Service) | ❌ rejected with toast: "Components belong to a Service. Drop a Service first." |
| **Component chip** | Empty canvas | ❌ rejected |
| **Pattern** | Empty canvas | Drops the pattern's full sub-spec at the drop point |

The drop validator is a single pure function `canDrop(item, target, spec)` consulted on hover (highlights valid targets) and on drop (final check). Single source of truth for drag-drop validation.

### 4.4 Component compatibility

The catalog declares which Component categories are valid in which Service kind:

- `frontend-app` accepts: `language`, `framework`, `library`, `build-tool`, `auth`, `entry-point`
- `backend-service` accepts: `language`, `runtime`, `framework`, `library`, `auth`, `entry-point`
- `database` accepts: `datastore` only (single, required)
- `cache`, `queue`: single component, kind matches the Service

### 4.5 Edge creation

- Hover any Service → 4 edge handles appear on perimeter.
- Click-drag from a handle → live edge follows cursor → drop on another Service.
- On drop, modal appears: "What kind of connection?" → pick protocol from a list (HTTP, GraphQL, gRPC, WebSocket, Queue, SQL, Key-Value, FS).
- Edge config (port, basePath, topicName, etc.) filled in via inspector when edge selected.
- Self-loops and duplicate edges (same from/to/protocol) rejected.

### 4.6 Side panel — three tabs

- **Spec tab** (live): pretty-printed, syntax-highlighted JSON. Updates on every spec mutation. Read-only in v1.
- **Files tab** (live, deterministic): renders the file tree via the rules engine over the spec (Section 7.3). No file contents — paths only.
- **Code tab** (on-demand): "Preview Code" button per service. Click → single agent call returning boilerplate for that service. Cached until the service's components or edges change. Cost-aware: button shows estimated tokens before clicking.

Inspector lives at the bottom of the side panel; shows the selected node's properties and lets the user edit them.

### 4.7 Selection, keyboard, undo

- Single click selects; shift-click adds; click empty canvas deselects.
- Selected nodes show resize handles (Groups) or move handles (Services).
- Right-click menu: Delete, Duplicate, Convert.
- Shortcuts: `Cmd/Ctrl-Z` undo, `Shift-Cmd/Ctrl-Z` redo, `Cmd/Ctrl-S` download, `Delete` remove, `Cmd/Ctrl-D` duplicate, `?` show overlay.
- Undo: full immutable spec history capped at 100 entries; rapid drags coalesce within 300 ms; IndexedDB persists every entry so reload preserves the stack.

---

## 5. CLI & Agent Handoff

### 5.1 Command surface (v1)

```bash
npx architext apply ./spec.json                          # default: claude-code
npx architext apply ./spec.json --agent claude-code      # explicit
npx architext apply ./spec.json --agent archon
npx architext apply ./spec.json --instructions "use bun instead of node"
npx architext apply ./spec.json --dry-run                # print prompt only
npx architext apply ./spec.json --force                  # overwrite existing dir

npx architext validate ./spec.json
npx architext init [project-name]                        # writes minimal spec.json

npx architext --version
npx architext --help
```

### 5.2 `apply` pipeline

1. Parse args, locate `spec.json`.
2. Read + parse JSON.
3. Validate against schema (Zod, from `@architext/schema`). On failure: pretty error pointing at the bad path.
4. Select meta-prompt for `spec.schemaVersion`. If no matching prompt: refuse, suggest CLI upgrade.
5. Build final prompt = meta-prompt + serialized spec + `--instructions`.
6. Determine target directory: `./<spec.project.slug>/`. Refuses if exists unless `--force`.
7. Pre-flight: required agent CLI installed and on PATH; CWD writable; user confirms ("Will create ./my-app/ using claude-code agent. Continue? [y/N]"). Auto-skip with `--yes`.
8. Spawn agent subprocess inside target dir; pipe stdout/stderr; tail dir for file creations; show small running counter.
9. Wait for `ARCHITEXT_DONE` sentinel or clean exit. On failure: leave partial work, report what was created.
10. Exit with summary: "✓ Created my-app/ with 4 services, 23 files. Run `cd my-app && npm install` to start."

### 5.3 Meta-prompt

Lives at `prompts/scaffold-v0.1.0.md` inside the CLI source — one file per schema major.minor. Picked by spec version. Versioned, reviewable, code-like artifact.

```markdown
# Architext Scaffold Prompt v0.1.0

You are scaffolding a project from a structured architecture specification.
Your job is to produce a running, idiomatic codebase that matches the spec.

## Hard Constraints
- Write all files into the current working directory.
- No Docker, no docker-compose, no Kubernetes — defer containerization.
- Each service must run with its standard local dev command
  (e.g., `npm run dev`, `uvicorn main:app --reload`).
- Honor exact component versions when specified.
- Use the `protocol` field on each edge to determine wire format.

## Spec Concepts
- **Groups** are logical containers; emit a top-level directory per group
  if the group has 2+ services, otherwise inline.
- **Services** become directories with their own dependency manifest
  (package.json, pyproject.toml, go.mod, etc.).
- **Components** are libraries/frameworks/languages installed inside
  the service. Use the canonical install for that ecosystem.
- **Edges** are typed connections — generate the corresponding client
  code on the `from` side and the corresponding server/handler on the
  `to` side.

## Per-Service-Kind Guidance
[detailed instructions for each ServiceKind]

## Per-Protocol Guidance
[for each Protocol: what files to generate on each end, what config to wire]

## Output Protocol
1. First, output a JSON plan: { services: [{ name, files: [path, ...] }] }
2. Then, write each file using your file-writing tools.
3. Finish with the literal token: ARCHITEXT_DONE
4. If you cannot complete the scaffold, finish with: ARCHITEXT_FAILED <reason>

## The Spec
[serialized JSON of the spec follows]
```

### 5.4 Agent backends

Backend interface:

```typescript
interface AgentBackend {
  name: string;
  isInstalled(): Promise<boolean>;
  spawn(prompt: string, opts: { cwd: string }): Promise<AgentRun>;
}
```

- **`claude-code`** (default): spawns `claude` CLI in non-interactive mode, pipes prompt via stdin, allows file-write tools scoped to target dir.
- **`archon`**: integration spec'd; final wiring built once Archon implementations are in place.

Future backends (`gemini-cli`, `codex`, etc.) plug in by implementing the same interface.

### 5.5 Output / progress UX

CLI streams the agent's stdout to the user's terminal verbatim, plus a thin in-place ANSI status bar at the top:

```
  Architext · my-app · claude-code · 12 files written · 1m23s elapsed
```

Removed cleanly on exit.

### 5.6 Error handling

| Failure | Exit | Behavior |
|---|---|---|
| Spec doesn't parse as JSON | 2 | Pretty error with line/col |
| Spec fails schema validation | 2 | Pretty error with offending path |
| Agent CLI not on PATH | 3 | Install instructions for the requested agent |
| Target dir exists, no `--force` | 4 | Clear message |
| Agent crashes mid-run | 5 | Partial files left in place; last 50 lines of stderr |
| Agent ends with `ARCHITEXT_FAILED` | 6 | Reason captured from agent |

No silent failures.

### 5.7 Web → CLI handoff

Web app has an "Apply…" button next to "Export". Clicking opens a modal:

> Run this command in your terminal:
> `npx architext apply ./architext-spec.json`
> [Download spec.json] [Copy command]

The web app does **not** invoke the CLI itself. The user is always the one running it.

---

## 6. Tech Stack & Repository Layout

### 6.1 Repo layout — pnpm monorepo

The five packages below implement the three logical pieces from Section 2 — the schema is split into multiple shared packages (`schema`, `catalog`, `patterns`, `files-engine`) so producers (web app) and consumers (CLI) can each import only what they need.

```
architext/
├── apps/
│   └── web/                     # the canvas SPA
├── packages/
│   ├── schema/                  # @architext/schema  — types, Zod, JSON Schema
│   ├── catalog/                 # @architext/catalog — component definitions
│   ├── patterns/                # @architext/patterns — composite-drop templates
│   ├── files-engine/            # @architext/files-engine — deterministic file-tree rules
│   └── cli/                     # @architext/cli      — npx entry point
├── prompts/
│   └── scaffold-v0.1.0.md       # meta-prompt for the agent
├── docs/
│   └── superpowers/specs/       # this PRD
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

Each package has one clear consumer:

- `schema` → `web`, `cli`, `files-engine`
- `catalog` → `web` (palette), `cli` (prompt enrichment), `files-engine` (rules lookup)
- `patterns` → `web` only
- `files-engine` → `web` (Files tab) and `cli` (validation)
- `cli` → only published artifact under a versioned tag

### 6.2 Web app stack

| Concern | Choice | Reasoning |
|---|---|---|
| Build tool | **Vite** | Fast dev server, simple config, pure SPA |
| Framework | **React 18+** | Required by React Flow; largest ecosystem |
| Language | **TypeScript** strict | Schema is the contract; types must be precise |
| Canvas | **`@xyflow/react`** | Industry standard for node-edge canvases |
| State | **Zustand** | Pairs cleanly with React Flow; immutable history simple |
| Validation | **Zod** | Single validator imported from `@architext/schema` |
| Styling | **Tailwind CSS** | Fast iteration on a dense UI |
| Code highlighting | **Shiki** | Used in Spec tab and Code tab |
| Persistence | **`idb-keyval`** | Tiny IndexedDB wrapper |
| Icons | **Lucide React** | Consistent line icons |
| Testing | **Vitest** + **Playwright** | Unit/integration + canvas E2E |

### 6.3 CLI stack

| Concern | Choice | Reasoning |
|---|---|---|
| Runtime | **Node 20+** | Modern ESM, native fetch |
| Framework | **Commander.js** | Battle-tested, minimal API |
| Validation | **Zod** (shared) | Same validator as web |
| Process spawning | **`node:child_process`** | Native |
| Terminal output | **`chalk`** + **`ora`** | Color + spinners |
| Bundling | **`tsup`** | Single ESM bundle |
| Testing | **Vitest** | Fast unit tests for prompt assembly |

### 6.4 Schema package stack

- Zod schemas as primary source.
- TypeScript types derived (`z.infer`).
- JSON Schema generated from Zod (for editor tooling, future API consumers).
- `tsup` produces dual ESM/CJS output.
- Published as `@architext/schema` with versioning that matches the spec version (`0.1.0` package = `schemaVersion: "0.1.0"`).

### 6.5 Hosting / distribution

| Artifact | Where |
|---|---|
| Web app — primary | **Local dev** (`pnpm dev` → `localhost:5173`) |
| Web app — optional deploy | **Railway** (built bundle served by `serve` or thin Hono server) |
| CLI | **npm** under `@architext/cli`, run via `npx architext` |
| Schema package | **npm** under `@architext/schema` |
| Source code | Single GitHub repo (license selected by owner before first publish) |

For Railway: simplest setup is `pnpm build && pnpm start` where `start` runs `serve -s dist -l $PORT`. A thin Hono server replaces `serve` in v1.5+ when cloud features arrive.

### 6.6 Why these choices

- **pnpm over npm/yarn:** first-class workspaces, content-addressable disk, strict by default.
- **React + React Flow over Svelte + Svelte Flow:** larger ecosystem, more examples for the complex custom-node UX. Svelte port remains feasible since `@xyflow` has Svelte/Vue ports.
- **No Tauri/Electron in v1:** confirmed scope. Stays a v2+ option.
- **No backend:** keeps operating cost at $0, privacy story simple, scope contained. v1.5 features will bolt on a backend separately.

---

## 7. Component Catalog, File Rules, and Patterns

The catalog defines what users can drop. The file-rules engine makes the Files tab honest. The patterns library makes the canvas feel productive instantly. **All three are data, not code.**

### 7.1 Catalog entry schema (`@architext/catalog`)

```typescript
interface CatalogEntry {
  id: string;                     // stable id; matches spec.components[].id
  category: ComponentCategory;
  name: string;                   // display name
  description: string;            // one line for the palette tooltip
  tags: string[];                 // ["frontend", "spa", "ui"]

  // Drop behavior
  dropsAs: "service" | "component";
  serviceKindIfService?: ServiceKind;     // required iff dropsAs === "service"
  compatibleServiceKinds: ServiceKind[];  // for component chips

  // File-tree contributions
  files?: FileRule[];

  // Defaults
  defaultConfig?: Record<string, unknown>;
  defaultVersion?: string;
  iconUrl?: string;
}

interface FileRule {
  path: string;                   // relative to the service dir
  when?: {
    serviceKind?: ServiceKind[];
    requires?: string[];          // other component ids that must be present
    excludes?: string[];          // other component ids that must NOT be present
  };
}
```

Example — `react`:

```json
{
  "id": "react",
  "category": "library",
  "name": "React",
  "description": "Component-based UI library",
  "tags": ["frontend", "ui", "spa"],
  "dropsAs": "component",
  "compatibleServiceKinds": ["frontend-app"],
  "files": [
    { "path": "src/main.tsx", "when": { "requires": ["typescript"] } },
    { "path": "src/main.jsx", "when": { "excludes": ["typescript"] } },
    { "path": "src/App.tsx", "when": { "requires": ["typescript"] } }
  ],
  "defaultVersion": "^18.3.0"
}
```

Example — `postgres`:

```json
{
  "id": "postgres",
  "category": "datastore",
  "name": "PostgreSQL",
  "description": "Relational SQL database",
  "tags": ["database", "sql", "relational"],
  "dropsAs": "service",
  "serviceKindIfService": "database",
  "files": [{ "path": "schema.sql" }],
  "defaultConfig": { "port": 5432 }
}
```

When `dropsAs` is `"service"`, the `compatibleServiceKinds` field is omitted — the entry *creates* a Service of `serviceKindIfService` rather than being dropped *into* one. When `dropsAs` is `"component"`, `compatibleServiceKinds` is required and `serviceKindIfService` is omitted.

### 7.2 v1 catalog scope (≥22 entries)

| Category | Entries |
|---|---|
| Languages | TypeScript, Python, Go |
| Runtimes | Node, Bun |
| Frontend frameworks | React, Vue, Svelte, Next.js |
| Backend frameworks | FastAPI, Express, NestJS, Django |
| Build tools | Vite |
| Datastores (drop as Service) | PostgreSQL, MySQL, MongoDB, Redis |
| Queues (drop as Service) | RabbitMQ, Redis Streams |
| Auth | Auth.js, Clerk |
| Entry points | HTTP route, Scheduled job, Queue consumer, `main()` |

Adding more is a JSON-only contribution. Catalog entries unit-tested for: valid JSON, no duplicate ids, all referenced ServiceKinds exist, file rules don't reference unknown component ids.

### 7.3 File-tree rules engine (`@architext/files-engine`)

Pure function consumed by both web app and CLI:

```typescript
function computeFileTree(spec: ArchitextSpec, catalog: Catalog): FileTree {
  // For each Service:
  //   collect all files contributed by its components, filtered by `when` conditions
  //   prefix paths with `<service.name>/`
  // For each Group with ≥2 services: emit a parent directory
  // Always emit:
  //   - architext-spec.json (round-trip artifact)
  //   - README.md
  //   - .gitignore (composed from per-service contributions)
  // Sort and dedupe paths
}

interface FileTree {
  paths: string[];
  byService: Record<string, string[]>;
}
```

**Important constraint:** the rules engine produces *path predictions only* — never file contents. The actual contents come from the agent. This is honest with users: "Architext predicts these files will exist; the agent writes their contents."

Run in two places:

- **Web app, on every spec change** — feeds the Files tab. Cheap, pure, no I/O.
- **CLI, before agent invocation** — produces a file-list included in the meta-prompt as ground truth: "These files are expected to exist. Add others as needed but do not omit these."

This makes the engine a soft contract with the agent — measurable success becomes "did the agent produce at least every predicted file?"

### 7.4 Patterns library (`@architext/patterns`)

```typescript
interface Pattern {
  id: string;                    // "rest-api-with-db"
  name: string;
  description: string;
  iconUrl?: string;
  preview?: string;              // small SVG
  fragment: SpecFragment;
}

interface SpecFragment {
  groups?: Partial<Group>[];
  services: Partial<Service>[];
  edges: Partial<Edge>[];
}
```

When dropped, the canvas:

1. Generates fresh ids for every node and edge.
2. Re-points `groupId` and `from`/`to` references to new ids.
3. Offsets `position` by the drop point.
4. Inserts atomically (single undo step).

**v1 patterns (≥5):**

- **REST API + DB** — `backend-service` + `database` + `http` + `sql` edges
- **Frontend + Backend + DB** — `frontend-app` + `backend-service` + `database` + wired
- **Worker + Queue** — `backend-service` (producer) + `queue` + `worker` (consumer)
- **Cached API** — `backend-service` + `cache` (Redis) + `database`
- **Microservices skeleton** — group with 3 `backend-service`s sharing a `database`

Adding a pattern = one JSON file + one SVG. Future-friendly for community contributions when v2 plugin system arrives.

---

## 8. Testing Strategy

### Schema package
- Unit tests for every Zod schema: valid example, invalid example, edge cases for the discriminated edge union.
- Round-trip test: parse → serialize → parse produces identical output.
- Schema version compatibility test: `0.1.0` validator accepts only `0.1.0` specs.

### Catalog & files-engine
- Unit tests for every catalog entry (valid JSON, ids unique, references resolve).
- Files-engine: snapshot tests against a fixture set of specs covering every ServiceKind × common Component combinations.
- Determinism test: same spec produces identical file tree across runs.

### Web app
- Vitest unit tests for `canDrop`, undo/redo store, spec serialization.
- Playwright E2E: build a 4-service architecture from scratch in <5 min (success criterion 1).
- Playwright E2E: load a saved spec from IndexedDB, verify canvas matches.
- Playwright E2E: export → CLI roundtrip via mocked agent (validates the spec the CLI receives).

### CLI
- Vitest unit tests for argument parsing, prompt assembly, error formatting.
- Integration tests with mocked agent backend that returns `ARCHITEXT_DONE` / `ARCHITEXT_FAILED`.
- Snapshot tests on the assembled meta-prompt for representative specs.

### Cross-package
- A small fixture suite of 10 "golden specs" (intentionally chosen to cover all ServiceKinds and protocols). Each is run through: schema validation, files-engine, mocked CLI apply. Any package change that breaks a golden spec fails CI.

---

## 9. Build Sequence

Suggested order for implementation (each step produces a working artifact, agent-friendly):

1. **Schema package** — Zod schemas, types, JSON Schema generation, unit tests.
2. **Catalog package** — minimum 5 entries to unblock files-engine; expand to 22+ later.
3. **Patterns package** — minimum 1 pattern; expand to 5+ later.
4. **Files-engine package** — pure rules engine consuming schema + catalog; snapshot tests against 5 golden specs.
5. **CLI package** — `validate` and `init` first (no agent needed), then `apply` with a mocked agent backend, then real claude-code backend.
6. **Meta-prompt** — versioned text, paired with golden specs for prompt regression tests.
7. **Web app — canvas core** — React Flow setup, render Services/Groups/Edges from spec, no editing.
8. **Web app — palette + drop rules** — two-stage browser, `canDrop` validator.
9. **Web app — edge creation + inspector** — full editing loop closes here.
10. **Web app — side panel: Spec tab** — live JSON.
11. **Web app — side panel: Files tab** — wire in files-engine.
12. **Web app — side panel: Code tab** — on-demand agent call per service.
13. **Web app — IndexedDB persistence + undo/redo** — round-trip safety.
14. **Web app — Export and Apply… modals** — CLI handoff.
15. **Polish, documentation, Railway deploy config.**

Steps 1–6 produce a usable CLI even before any UI exists — a strong invariant.

---

## 10. Open Questions Deferred

These are intentionally postponed until v1 ships and we have user feedback:

- Contract layer (Q3 option C from brainstorming). Reserved in schema, deferred in implementation.
- Plugin system for community-authored components. v1 has data-driven extensibility (JSON files in catalog/patterns), which is enough until contributor demand justifies a plugin loader.
- Cloud project save / shareable links. Backend-required; deferred to v1.5.
- Live (per-keystroke) code preview. Q5 option D was tabbed; v1 ships Code tab as on-demand only. Per-keystroke previews require either a template library (Q6 option A) or a much faster LLM call.
- Multi-canvas workspaces (dev/staging/prod variants). v2.
- Offline-first / Tauri desktop port. v2+.

---

## Appendix A: Brainstorming Decisions Summary

| Decision | Choice | Reasoning |
|---|---|---|
| Output fidelity | **B** (Topology + contracts) | Enough constraint for predictable agent output, not so much that the canvas becomes tedious |
| Canvas grouping | **B+C hybrid** (Group → Service → Component) | Matches real architecture diagrams; supports microservices |
| Wiring | **B** typed edges, with **C** as v1.5 path | Carries protocol-specific config now; contracts layer on top later |
| Distribution | **C** web app + npx CLI | Zero install for the canvas; CLI bridges to local disk |
| Live preview | **D** tabbed Spec/Files/Code | Spec/Files live in v1; Code on-demand in v1, per-keystroke in v1.5+ |
| Code generation | **B** agent generates everything | No template library; meta-prompt + JSON spec to claude-code/archon |
| Hosting | Local-first + **Railway** optional | Local dev primary; cloud deploy when sharing matters |

---

## Appendix B: Glossary

- **Spec** — the JSON document produced by the canvas, consumed by the CLI
- **Group** — visual grouping of related Services on the canvas
- **Service** — a deployable unit (frontend app, backend service, database, etc.)
- **Component** — a library/framework/language chip dropped inside a Service
- **Edge** — a typed connection between two Services
- **Pattern** — a composite drop that emits multiple pre-wired Services and Edges
- **Meta-prompt** — the versioned prompt the CLI sends to the agent alongside the spec
- **Files-engine** — the deterministic rules engine that predicts the file tree from a spec
- **Backend** (CLI sense) — an agent integration (claude-code, archon)
