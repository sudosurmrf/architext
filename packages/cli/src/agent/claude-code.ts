/**
 * @module @architext/cli/agent/claude-code
 * Concepts: [[ClaudeCodeBackend]], [[Subprocess]], [[Sentinels]]
 * Spec: §5.4 Agent backends — claude-code default
 * Depends on: [[backend]], node:child_process, node:readline
 * Consumed by: [[agent/select]], [[commands/apply]]
 */

import { spawn as childSpawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { AgentBackend, AgentRun, AgentRunResult } from "./backend";

export class ClaudeCodeBackend implements AgentBackend {
  readonly name = "claude-code";

  async isInstalled(): Promise<boolean> {
    return new Promise((resolveBool) => {
      const proc = childSpawn("claude", ["--version"], { stdio: "ignore" });
      proc.on("error", () => resolveBool(false));
      proc.on("exit", (code) => resolveBool(code === 0));
    });
  }

  spawn(prompt: string, opts: { cwd: string }): AgentRun {
    const proc = childSpawn("claude", ["--print"], {
      cwd: opts.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stdin.write(prompt);
    proc.stdin.end();

    const stderrChunks: string[] = [];
    proc.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk.toString("utf-8"));
      // Keep only last ~50 lines worth.
      while (stderrChunks.join("").length > 8192) stderrChunks.shift();
    });

    let resolveLines!: (lines: AsyncIterable<string>) => void;
    const linesPromise: Promise<AsyncIterable<string>> = new Promise((r) => {
      resolveLines = r;
    });

    const linesIter = (async function* () {
      const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });
      for await (const line of rl) yield line;
    })();
    resolveLines(linesIter);
    void linesPromise; // keep variable to silence "unused" warnings under strict mode

    const done: Promise<AgentRunResult> = new Promise((resolveResult) => {
      const lastOutLines: string[] = [];
      const tap = createInterface({ input: proc.stdout, crlfDelay: Infinity });
      tap.on("line", (line) => {
        lastOutLines.push(line);
        if (lastOutLines.length > 200) lastOutLines.shift();
      });

      proc.on("error", () => {
        resolveResult({ kind: "crashed", stderrTail: stderrChunks.join("") });
      });
      proc.on("exit", (exitCode) => {
        // Look at the last output lines for sentinels.
        for (let i = lastOutLines.length - 1; i >= 0; i--) {
          const ln = lastOutLines[i] ?? "";
          if (ln.startsWith("ARCHITEXT_DONE")) {
            const filesWritten = lastOutLines.filter((l) => l.startsWith("wrote ")).length;
            resolveResult({ kind: "done", filesWritten });
            return;
          }
          if (ln.startsWith("ARCHITEXT_FAILED")) {
            const reason = ln.replace(/^ARCHITEXT_FAILED\s*/, "").trim();
            resolveResult({ kind: "failed", reason: reason.length > 0 ? reason : "unspecified" });
            return;
          }
        }
        if (exitCode !== 0) {
          resolveResult({ kind: "crashed", stderrTail: stderrChunks.join("") });
        } else {
          resolveResult({
            kind: "failed",
            reason: "agent exited cleanly without ARCHITEXT_DONE sentinel",
          });
        }
      });
    });

    return { done, stdoutLines: linesIter };
  }
}
