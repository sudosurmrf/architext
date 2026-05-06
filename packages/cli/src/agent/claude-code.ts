/**
 * @module @architext/cli/agent/claude-code
 * Concepts: [[ClaudeCodeBackend]], [[Subprocess]]
 * Spec: §5.4 Agent backends — claude-code default
 * Depends on: [[backend]], node:child_process
 * Consumed by: [[agent/select]], [[commands/apply]]
 */

import type { AgentBackend, AgentRun } from "./backend";
import { ApplyError, ExitCode } from "../errors";

export class ClaudeCodeBackend implements AgentBackend {
  readonly name = "claude-code";

  // Filled in for real in Task 13.
  async isInstalled(): Promise<boolean> {
    return false;
  }

  spawn(_prompt: string, _opts: { cwd: string }): AgentRun {
    throw new ApplyError(
      ExitCode.AgentNotInstalled,
      "ClaudeCodeBackend.spawn not yet implemented (Task 13)"
    );
  }
}
