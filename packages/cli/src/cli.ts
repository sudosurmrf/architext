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
