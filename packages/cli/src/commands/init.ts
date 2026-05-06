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
