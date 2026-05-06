import { describe, it, expect } from "vitest";
import { StatusBar } from "../src/status";

describe("StatusBar", () => {
  it("renders status lines via the write callback", () => {
    const out: string[] = [];
    const bar = new StatusBar({ write: (s) => out.push(s), now: () => 0 });
    bar.start({ project: "my-app", agent: "claude-code" });
    bar.update({ filesWritten: 3, elapsedMs: 0 });
    bar.stop();
    expect(out.some((s) => s.includes("my-app"))).toBe(true);
    expect(out.some((s) => s.includes("3 files written"))).toBe(true);
    expect(out.some((s) => s.includes("claude-code"))).toBe(true);
  });

  it("formats elapsed time as HH:MM:SS or MM:SS or Ns", () => {
    const out: string[] = [];
    const bar = new StatusBar({ write: (s) => out.push(s), now: () => 0 });
    bar.start({ project: "p", agent: "mock" });
    bar.update({ filesWritten: 1, elapsedMs: 4_500 });
    bar.update({ filesWritten: 1, elapsedMs: 65_000 });
    bar.update({ filesWritten: 1, elapsedMs: 3_725_000 });
    bar.stop();
    const joined = out.join("\n");
    expect(joined).toContain("4s");
    expect(joined).toContain("1m05s");
    expect(joined).toContain("1h02m05s");
  });

  it("emits an ANSI clear sequence on stop", () => {
    const out: string[] = [];
    const bar = new StatusBar({ write: (s) => out.push(s), now: () => 0 });
    bar.start({ project: "p", agent: "mock" });
    bar.stop();
    // Last write should clear the line.
    expect(out.some((s) => s.includes("\x1b[2K"))).toBe(true);
  });
});
