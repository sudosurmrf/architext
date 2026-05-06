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
