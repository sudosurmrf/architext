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
      while (stderrChunks.join("").length > 8192) stderrChunks.shift();
    });

    // Single readline reader; tee each line into both the public iterator
    // queue (consumed by callers via `stdoutLines`) and the internal ring
    // buffer used for sentinel detection at exit time.
    const lastOutLines: string[] = [];
    const lineQueue: string[] = [];
    let pendingResolve: ((line: string | null) => void) | undefined;
    let streamEnded = false;

    const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });
    rl.on("line", (line) => {
      lastOutLines.push(line);
      if (lastOutLines.length > 200) lastOutLines.shift();
      if (pendingResolve !== undefined) {
        const fn = pendingResolve;
        pendingResolve = undefined;
        fn(line);
      } else {
        lineQueue.push(line);
      }
    });
    rl.on("close", () => {
      streamEnded = true;
      if (pendingResolve !== undefined) {
        const fn = pendingResolve;
        pendingResolve = undefined;
        fn(null);
      }
    });

    const stdoutLines: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<string>> {
            if (lineQueue.length > 0) {
              return { value: lineQueue.shift() as string, done: false };
            }
            if (streamEnded) {
              return { value: undefined, done: true };
            }
            const next = await new Promise<string | null>((r) => {
              pendingResolve = r;
            });
            if (next === null) return { value: undefined, done: true };
            return { value: next, done: false };
          },
        };
      },
    };

    const done: Promise<AgentRunResult> = new Promise((resolveResult) => {
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

    return { done, stdoutLines };
  }
}
