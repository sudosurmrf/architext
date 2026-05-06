/**
 * @module @architext/cli/agent/backend
 * Concepts: [[AgentBackend]], [[AgentRun]], [[BackendInterface]]
 * Spec: §5.4 Agent backends
 * Depends on: none (interface only)
 * Consumed by: [[agent/mock]], [[agent/claude-code]], [[agent/select]], [[commands/apply]]
 */

export type AgentRunResult =
  | { kind: "done"; filesWritten: number }
  | { kind: "failed"; reason: string }
  | { kind: "crashed"; stderrTail: string };

export interface AgentRun {
  /** Promise resolving when the agent finishes (sentinel reached, exit, or crash). */
  readonly done: Promise<AgentRunResult>;
  /** Async iterator over stdout lines as they arrive. */
  readonly stdoutLines: AsyncIterable<string>;
}

export interface AgentBackend {
  readonly name: string;
  isInstalled(): Promise<boolean>;
  spawn(prompt: string, opts: { cwd: string }): AgentRun;
}
