import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runApply } from "../src/commands/apply";
import { ExitCode } from "../src/errors";
import { MockAgentBackend } from "../src/agent/mock";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-apply-"));
}

const validSpec = {
  schemaVersion: "0.1.0",
  project: { name: "Smoke", slug: "smoke" },
  groups: [],
  services: [],
  edges: [],
};

function writeSpec(dir: string): string {
  const p = resolve(dir, "spec.json");
  writeFileSync(p, JSON.stringify(validSpec));
  return p;
}

describe("runApply", () => {
  it("dry-run prints the assembled prompt and returns Success", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      dryRun: true,
      backend: new MockAgentBackend({ outcome: "done" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.Success);
    const joined = out.join("\n");
    expect(joined).toContain("# Architext Scaffold Prompt v0.1.0");
    expect(joined).toContain('"slug": "smoke"');
  });

  it("returns SpecInvalid for an invalid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify({ ...validSpec, schemaVersion: "9.9.9" }));
    const out: string[] = [];
    const code = await runApply({
      specPath: p,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "done" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.SpecInvalid);
  });

  it("returns AgentNotInstalled when the backend reports false", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "done", installed: false }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.AgentNotInstalled);
  });

  it("returns TargetExists if <cwd>/<slug>/ exists and --force is not set", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const target = resolve(dir, "smoke");
    require("node:fs").mkdirSync(target);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "done" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.TargetExists);
    expect(out.join("\n")).toMatch(/already exists/i);
  });

  it("succeeds end-to-end with mock backend, writing files to <cwd>/<slug>/", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({
        outcome: "done",
        filesToWrite: [
          { path: "README.md", content: "# Smoke" },
          { path: "package.json", content: "{}" },
        ],
      }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.Success);
    const target = resolve(dir, "smoke");
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(resolve(target, "README.md"), "utf-8")).toBe("# Smoke");
  });

  it("returns AgentFailedSentinel when backend resolves with kind=failed", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "failed", failureReason: "test failure" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.AgentFailedSentinel);
    expect(out.join("\n")).toContain("test failure");
  });

  it("returns AgentCrashed when backend resolves with kind=crashed", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({ outcome: "crashed", stderrTail: "oops" }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.AgentCrashed);
    expect(out.join("\n")).toContain("oops");
  });
});
