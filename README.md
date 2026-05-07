# Architext

Visual architecture editor that produces a structured JSON spec of a software system, then hands it to an AI coding agent (Claude Code or Archon) to scaffold the actual repo.

## How it works

1. **Design** — Open the canvas web app and drag services, groups, and components onto the visual editor. Connect them with typed edges (REST, gRPC, pub-sub, etc.).
2. **Export** — The canvas produces a `spec.json` file describing your entire architecture.
3. **Scaffold** — Run `npx architext apply` to hand the spec to an AI agent that generates a full project skeleton: directory structure, boilerplate files, configuration, and wiring.

Canvas &rarr; `spec.json` &rarr; `npx architext apply` &rarr; scaffolded repo.

## Getting Started

Requires Node 20+ and pnpm 9+.

```bash
# Install dependencies
pnpm install

# Start the web app (opens at http://localhost:5173)
pnpm dev

# Install the local create command once
./install-architext-create

# Alternative if pnpm globals are configured
pnpm --dir packages/cli link --global

# From any output folder containing architext-spec.json, create the scaffold
architext-create
```

## Repo layout

- `apps/web/` — canvas SPA (React + React Flow + Tailwind)
- `packages/schema/` — `@architext/schema`, the spec contract (Zod types + JSON Schema)
- `packages/catalog/` — `@architext/catalog`, component definitions
- `packages/patterns/` — `@architext/patterns`, composite-drop templates
- `packages/files-engine/` — `@architext/files-engine`, deterministic file-tree rules
- `packages/cli/` — `@architext/cli`, the `npx architext` entry point
- `prompts/` — versioned meta-prompts for the agent

## Development

```bash
pnpm install
pnpm test        # run all tests
pnpm build       # build all packages + web app
pnpm typecheck   # type-check without emitting
pnpm web:test    # run only web app tests
pnpm cli:test    # run only CLI tests
pnpm cli:build   # build only the local CLI
architext-create --force   # rerun generation with overwrite
```
