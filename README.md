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
