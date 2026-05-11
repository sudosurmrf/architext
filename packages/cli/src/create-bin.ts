/**
 * @module @architext/cli/create-bin
 * Concepts: [[CreateEntry]], [[GlobalCommand]], [[ApplyShortcut]]
 * Spec: Global command wrapper for creating scaffolds from the current folder
 * Depends on: [[commands/apply]], [[agent/claude-code]]
 * Consumed by: users via `architext-create`
 */

import { resolve } from "node:path";
import { runApply } from "./commands/apply";
import { ClaudeCodeBackend } from "./agent/claude-code";

const args = process.argv.slice(2);
const specArg = args.find((arg) => !arg.startsWith("-")) ?? "./architext-spec.json";
const flags = new Set(args.filter((arg) => arg.startsWith("-")));
const workflowRuntimeArg = valueAfter(args, "--workflow-runtime") ?? "auto";
const write = (s: string) => process.stdout.write(s + "\n");

runApply({
  specPath: resolve(process.cwd(), specArg),
  cwd: process.cwd(),
  backend: new ClaudeCodeBackend(),
  dryRun: flags.has("--dry-run"),
  force: flags.has("--force"),
  workflowRuntime:
    workflowRuntimeArg === "none" || workflowRuntimeArg === "langgraph-ts"
      ? workflowRuntimeArg
      : "auto",
  write,
}).then((code) => process.exit(code));

function valueAfter(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  return args[index + 1];
}
