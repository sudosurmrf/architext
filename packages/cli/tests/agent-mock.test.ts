import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { MockAgentBackend } from "../src/agent/mock";

function mktmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-test-"));
}

describe("MockAgentBackend", () => {
  it("reports installed=true by default", async () => {
    const m = new MockAgentBackend({ outcome: "done" });
    expect(await m.isInstalled()).toBe(true);
  });

  it("can be configured to report installed=false", async () => {
    const m = new MockAgentBackend({ outcome: "done", installed: false });
    expect(await m.isInstalled()).toBe(false);
  });

  it("on outcome 'done', writes files and resolves with kind=done", async () => {
    const cwd = mktmp();
    const m = new MockAgentBackend({
      outcome: "done",
      filesToWrite: [
        { path: "a.txt", content: "hello" },
        { path: "sub/b.txt", content: "world" },
      ],
    });
    const run = m.spawn("any prompt", { cwd });
    const result = await run.done;
    expect(result).toEqual({ kind: "done", filesWritten: 2 });
    expect(readFileSync(resolve(cwd, "a.txt"), "utf-8")).toBe("hello");
    expect(readFileSync(resolve(cwd, "sub/b.txt"), "utf-8")).toBe("world");
  });

  it("on outcome 'failed', resolves with kind=failed and the configured reason", async () => {
    const cwd = mktmp();
    const m = new MockAgentBackend({ outcome: "failed", failureReason: "could not understand spec" });
    const run = m.spawn("p", { cwd });
    const result = await run.done;
    expect(result).toEqual({ kind: "failed", reason: "could not understand spec" });
  });

  it("on outcome 'crashed', resolves with kind=crashed and stderr tail", async () => {
    const cwd = mktmp();
    const m = new MockAgentBackend({ outcome: "crashed", stderrTail: "segfault\nat foo" });
    const run = m.spawn("p", { cwd });
    const result = await run.done;
    expect(result).toEqual({ kind: "crashed", stderrTail: "segfault\nat foo" });
  });

  it("emits one stdout line per file written, then the sentinel", async () => {
    const cwd = mktmp();
    const m = new MockAgentBackend({
      outcome: "done",
      filesToWrite: [{ path: "x.txt", content: "x" }],
    });
    const run = m.spawn("p", { cwd });
    const lines: string[] = [];
    for await (const line of run.stdoutLines) lines.push(line);
    await run.done;
    expect(lines).toContain("wrote x.txt");
    expect(lines).toContain("ARCHITEXT_DONE");
  });
});
