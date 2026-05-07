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
    expect(joined).toContain("Expected File Contract");
    expect(joined).toContain("- README.md");
    expect(joined).toContain('"slug": "smoke"');
    expect(existsSync(resolve(dir, "smoke"))).toBe(false);
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

  it("reports missing expected files when mock backend writes only a subset", async () => {
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
        ],
      }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.ScaffoldContractFailed);
    expect(out.join("\n")).toContain("Scaffold contract: FAIL");
    expect(out.join("\n")).toContain(".gitignore");
    expect(out.join("\n")).toContain("architext-spec.json");
  });

  it("succeeds end-to-end when mock backend writes every expected file", async () => {
    const dir = tmp();
    const specPath = writeSpec(dir);
    const out: string[] = [];
    const code = await runApply({
      specPath,
      cwd: dir,
      backend: new MockAgentBackend({
        outcome: "done",
        filesToWrite: [
          { path: ".gitignore", content: "node_modules/\n" },
          { path: "README.md", content: "# Smoke\n\nnpm run dev\n" },
          { path: "architext-spec.json", content: JSON.stringify(validSpec) },
          { path: "package.json", content: "{}" },
          { path: "tmpnodejsnpm-cache/_logs/debug.log", content: "cache noise" },
          { path: "node_modules/example/index.js", content: "cache noise" },
        ],
      }),
      write: (s) => out.push(s),
    });
    expect(code).toBe(ExitCode.Success);
    const target = resolve(dir, "smoke");
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(resolve(target, "README.md"), "utf-8")).toContain("# Smoke");
    expect(out.join("\n")).toContain("Scaffold contract: PASS");
    expect(out.join("\n")).toContain("npm run dev");
    expect(out.join("\n")).toContain("Extra files created: 1");
    expect(out.join("\n")).toContain("package.json");
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
