/**
 * @module @architext/cli/agent/select
 * Concepts: [[BackendFactory]], [[Selector]]
 * Spec: §5.4 Agent backends — name-based dispatch
 * Depends on: [[backend]], [[mock]], [[claude-code]], [[errors]]
 * Consumed by: [[commands/apply]]
 */

import type { AgentBackend } from "./backend";
import { MockAgentBackend } from "./mock";
import { ClaudeCodeBackend } from "./claude-code";
import { ApplyError, ExitCode } from "../errors";

export function selectBackend(name: string): AgentBackend {
  switch (name) {
    case "claude-code":
      return new ClaudeCodeBackend();
    case "mock":
      return new MockAgentBackend({ outcome: "done" });
    case "archon":
      throw new ApplyError(
        ExitCode.Generic,
        "agent backend 'archon' is reserved but not yet implemented in this version"
      );
    default:
      throw new ApplyError(ExitCode.Generic, `unknown agent backend: ${name}`);
  }
}
