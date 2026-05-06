import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCli } from "../src/cli";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-int-"));
}

const validSpec = {
  schemaVersion: "0.1.0",
  project: { name: "Integ", slug: "integ" },
  groups: [],
  services: [],
  edges: [],
};

describe("runCli (end-to-end)", () => {
  it("validate exits 0 for a valid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const code = await runCli(["node", "architext", "validate", p]);
    expect(code).toBe(0);
  });

  it("validate exits 2 for an invalid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify({ ...validSpec, schemaVersion: "9.9.9" }));
    const code = await runCli(["node", "architext", "validate", p]);
    expect(code).toBe(2);
  });

  it("init writes a valid spec.json in the current cwd", async () => {
    const dir = tmp();
    const oldCwd = process.cwd();
    try {
      process.chdir(dir);
      const code = await runCli(["node", "architext", "init", "my-test"]);
      expect(code).toBe(0);
      const written = JSON.parse(readFileSync(resolve(dir, "spec.json"), "utf-8"));
      expect(written.project.slug).toBe("my-test");
    } finally {
      process.chdir(oldCwd);
    }
  });

  it("apply --agent mock --dry-run prints the prompt and exits 0", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const oldCwd = process.cwd();
    try {
      process.chdir(dir);
      const code = await runCli([
        "node",
        "architext",
        "apply",
        p,
        "--agent",
        "mock",
        "--dry-run",
      ]);
      expect(code).toBe(0);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it("apply --agent mock writes files into <cwd>/<slug>/", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const oldCwd = process.cwd();
    try {
      process.chdir(dir);
      const code = await runCli([
        "node",
        "architext",
        "apply",
        p,
        "--agent",
        "mock",
      ]);
      expect(code).toBe(0);
      // The mock with default outcome writes 0 files but creates the target dir.
      expect(existsSync(resolve(dir, "integ"))).toBe(true);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it("apply with no --agent and no claude on PATH exits 3 (AgentNotInstalled)", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const oldCwd = process.cwd();
    const oldPath = process.env.PATH;
    try {
      process.chdir(dir);
      // Neutralize PATH so `claude` is not findable.
      process.env.PATH = "/nonexistent";
      const code = await runCli(["node", "architext", "apply", p]);
      expect(code).toBe(3);
    } finally {
      process.chdir(oldCwd);
      process.env.PATH = oldPath;
    }
  });
});
