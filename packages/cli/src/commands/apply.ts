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

  // 7. Stream stdout lines through the write callback. Capture the iterator
  //    promise so we can drain it before printing the summary line — otherwise
  //    real backends with async stdout (Task 13's ClaudeCodeBackend) would
  //    interleave or lose trailing lines because run.done can resolve before
  //    the iterator finishes.
  let streamError: Error | undefined;
  const stdoutDone = (async () => {
    for await (const line of run.stdoutLines) opts.write(line);
  })().catch((err) => {
    streamError = err as Error;
    opts.write(`stdout stream error: ${streamError.message}`);
  });

  // 8. Await result and the stdout drain, then translate to exit code.
  const result = await run.done;
  await stdoutDone;

  // If the stream errored, prefer the crashed exit code over the backend's
  // self-reported success — a broken transport means we can't trust "done".
  if (streamError !== undefined && result.kind === "done") {
    return ExitCode.AgentCrashed;
  }

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
