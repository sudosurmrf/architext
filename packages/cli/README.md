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
