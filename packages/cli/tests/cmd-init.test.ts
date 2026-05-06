import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInit } from "../src/commands/init";
import { ExitCode } from "../src/errors";
import { ArchitextSpecSchema } from "@architext/schema";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-init-"));
}

describe("runInit", () => {
  it("writes a valid minimal spec.json with the given project name", async () => {
    const dir = tmp();
    const out: string[] = [];
    const code = await runInit({ projectName: "my-cool-app", cwd: dir, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.Success);
    const path = resolve(dir, "spec.json");
    expect(existsSync(path)).toBe(true);
    const parsed = ArchitextSpecSchema.safeParse(JSON.parse(readFileSync(path, "utf-8")));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.project.slug).toBe("my-cool-app");
      expect(parsed.data.project.name).toBe("my-cool-app");
    }
  });

  it("defaults projectName to 'my-app'", async () => {
    const dir = tmp();
    const code = await runInit({ cwd: dir, write: () => {} });
    expect(code).toBe(ExitCode.Success);
    const parsed = JSON.parse(readFileSync(resolve(dir, "spec.json"), "utf-8"));
    expect(parsed.project.slug).toBe("my-app");
  });

  it("refuses to overwrite an existing spec.json", async () => {
    const dir = tmp();
    writeFileSync(resolve(dir, "spec.json"), "existing content");
    const out: string[] = [];
    const code = await runInit({ cwd: dir, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.TargetExists);
    expect(out.join("\n")).toMatch(/already exists/i);
    // Existing content preserved.
    expect(readFileSync(resolve(dir, "spec.json"), "utf-8")).toBe("existing content");
  });

  it("rejects non-slug-safe project names", async () => {
    const dir = tmp();
    const out: string[] = [];
    const code = await runInit({ projectName: "Has Spaces!", cwd: dir, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.SpecInvalid);
    expect(out.join("\n")).toMatch(/slug|kebab/i);
  });
});
