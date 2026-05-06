/**
 * @module @architext/cli/agent/mock
 * Concepts: [[MockAgentBackend]], [[TestDouble]]
 * Spec: §5.4 Agent backends — implementation of the AgentBackend interface for tests
 * Depends on: [[backend]] (AgentBackend, AgentRun), node:fs, node:path
 * Consumed by: tests, [[commands/apply]] tests
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AgentBackend, AgentRun, AgentRunResult } from "./backend";

export interface MockAgentConfig {
  outcome: "done" | "failed" | "crashed";
  installed?: boolean;
  filesToWrite?: { path: string; content: string }[];
  failureReason?: string;
  stderrTail?: string;
}

export class MockAgentBackend implements AgentBackend {
  readonly name = "mock";

  constructor(private readonly cfg: MockAgentConfig) {}

  async isInstalled(): Promise<boolean> {
    return this.cfg.installed ?? true;
  }

  spawn(_prompt: string, opts: { cwd: string }): AgentRun {
    const lines: string[] = [];
    let result: AgentRunResult;

    if (this.cfg.outcome === "done") {
      const files = this.cfg.filesToWrite ?? [];
      for (const f of files) {
        const full = resolve(opts.cwd, f.path);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, f.content);
        lines.push(`wrote ${f.path}`);
      }
      lines.push("ARCHITEXT_DONE");
      result = { kind: "done", filesWritten: files.length };
    } else if (this.cfg.outcome === "failed") {
      const reason = this.cfg.failureReason ?? "unspecified";
      lines.push(`ARCHITEXT_FAILED ${reason}`);
      result = { kind: "failed", reason };
    } else {
      result = { kind: "crashed", stderrTail: this.cfg.stderrTail ?? "" };
    }

    return {
      done: Promise.resolve(result),
      stdoutLines: (async function* () {
        for (const ln of lines) yield ln;
      })(),
    };
  }
}
