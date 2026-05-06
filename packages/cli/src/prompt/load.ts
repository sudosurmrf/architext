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
