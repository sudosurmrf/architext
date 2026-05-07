/**
 * @module @architext/cli/errors
 * Concepts: [[ExitCode]], [[ApplyError]], [[ZodErrorFormatting]]
 * Spec: §5.6 Error handling — exit codes table
 * Depends on: zod
 * Consumed by: every command, [[bin]] (top-level catch), [[cli]] (runCli return value)
 */

import type { ZodError } from "zod";

export enum ExitCode {
  Success = 0,
  Generic = 1,
  SpecInvalid = 2,
  AgentNotInstalled = 3,
  TargetExists = 4,
  AgentCrashed = 5,
  AgentFailedSentinel = 6,
  ScaffoldContractFailed = 7,
}

export class ApplyError extends Error {
  constructor(public readonly code: ExitCode, message: string) {
    super(message);
    this.name = "ApplyError";
  }
}

export function formatZodError(err: ZodError): string {
  if (!err.issues || err.issues.length === 0) return "";
  return err.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      return `  ${path}: ${issue.message}`;
    })
    .join("\n");
}
