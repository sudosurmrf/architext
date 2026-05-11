/**
 * @module @architext/cli/commands/apply
 * Concepts: [[ApplyCommand]], [[Pipeline]], [[Orchestrator]]
 * Spec: Section 5.2 apply pipeline
 * Depends on: [[@architext/schema]], [[errors]], [[prompt/load]], [[prompt/build]], [[agent/backend]]
 * Consumed by: [[cli]]
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ArchitextSpecSchema } from "@architext/schema";
import { formatWorkflowManifest, type WorkflowRuntime } from "@architext/constraints";
import { ExitCode, formatZodError } from "../errors";
import { loadMetaPrompt } from "../prompt/load";
import { buildPrompt } from "../prompt/build";
import type { AgentBackend } from "../agent/backend";
import {
  buildScaffoldContract,
  formatConstraintDiagnostics,
  formatScaffoldVerification,
  verifyScaffoldContract,
} from "../contract";

export interface ApplyOpts {
  specPath: string;
  cwd: string;
  backend: AgentBackend;
  instructions?: string;
  dryRun?: boolean;
  force?: boolean;
  workflowRuntime?: WorkflowRuntime | "auto";
  write: (s: string) => void;
}

export async function runApply(opts: ApplyOpts): Promise<ExitCode> {
  const startedAt = Date.now();

  // 1. Read and parse spec.
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
  const contract = buildScaffoldContract(spec, {
    workflowRuntime: opts.workflowRuntime ?? "auto",
  });

  // 2. Load meta-prompt and assemble final prompt.
  let meta: string;
  try {
    meta = loadMetaPrompt(spec.schemaVersion);
  } catch (err) {
    opts.write((err as Error).message);
    return ExitCode.SpecInvalid;
  }
  const fullPrompt = buildPrompt(meta, spec, opts.instructions, contract);

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

  // 5. Resolve and prepare target directory.
  const target = resolve(opts.cwd, spec.project.slug);
  if (existsSync(target) && opts.force !== true) {
    opts.write(
      `target directory already exists: ${target}. Pass --force to overwrite.`
    );
    return ExitCode.TargetExists;
  }
  mkdirSync(target, { recursive: true });
  writeFileSync(
    resolve(target, "architext-workflow.json"),
    formatWorkflowManifest(contract.workflowManifest) + "\n"
  );
  opts.write("Architext apply");
  opts.write(`  target: ${target}`);
  opts.write(`  agent: ${opts.backend.name}`);
  opts.write(`  expected files: ${contract.expectedPaths.length}`);
  opts.write("  workflow manifest: architext-workflow.json");
  opts.write(`  workflow runtime: ${contract.workflowManifest.runtimeHints.runtime}`);
  opts.write(formatConstraintDiagnostics(contract.diagnostics));

  // 6. Spawn backend.
  const run = opts.backend.spawn(fullPrompt, { cwd: target });

  // 7. Stream stdout lines through the write callback. Capture the iterator
  //    promise so we can drain it before printing the summary line.
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

  if (streamError !== undefined && result.kind === "done") {
    return ExitCode.AgentCrashed;
  }

  switch (result.kind) {
    case "done": {
      const verification = verifyScaffoldContract(target, contract);
      opts.write(formatScaffoldVerification(verification));
      opts.write(formatConstraintDiagnostics(contract.diagnostics));
      opts.write(
        `created ${target} (${result.filesWritten} files reported by ${opts.backend.name}, ${formatElapsed(Date.now() - startedAt)} elapsed)`
      );
      return verification.missingPaths.length === 0
        ? ExitCode.Success
        : ExitCode.ScaffoldContractFailed;
    }
    case "failed":
      opts.write(`agent ended with ARCHITEXT_FAILED: ${result.reason}`);
      opts.write(`partial output preserved at: ${target}`);
      return ExitCode.AgentFailedSentinel;
    case "crashed":
      opts.write(`agent crashed mid-run. Last stderr lines:\n${result.stderrTail}`);
      opts.write(`partial output preserved at: ${target}`);
      return ExitCode.AgentCrashed;
  }
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m${sec.toString().padStart(2, "0")}s`;
}
