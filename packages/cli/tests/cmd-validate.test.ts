import { describe, it, expect } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runValidate } from "../src/commands/validate";
import { ExitCode } from "../src/errors";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "architext-validate-"));
}

const validSpec = {
  schemaVersion: "0.1.0",
  project: { name: "T", slug: "t" },
  groups: [],
  services: [],
  edges: [],
};

describe("runValidate", () => {
  it("returns Success and prints OK for a valid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify(validSpec));
    const out: string[] = [];
    const code = await runValidate({ specPath: p, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.Success);
    expect(out.join("\n")).toMatch(/valid/i);
  });

  it("returns SpecInvalid and prints offending field for a schema-invalid spec", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, JSON.stringify({ ...validSpec, schemaVersion: "9.9.9" }));
    const out: string[] = [];
    const code = await runValidate({ specPath: p, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.SpecInvalid);
    expect(out.join("\n")).toContain("schemaVersion");
  });

  it("returns SpecInvalid for malformed JSON", async () => {
    const dir = tmp();
    const p = resolve(dir, "spec.json");
    writeFileSync(p, "{ not json");
    const out: string[] = [];
    const code = await runValidate({ specPath: p, write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.SpecInvalid);
    expect(out.join("\n")).toMatch(/parse|json/i);
  });

  it("returns Generic if file does not exist", async () => {
    const out: string[] = [];
    const code = await runValidate({ specPath: "/no/such/file.json", write: (s) => out.push(s) });
    expect(code).toBe(ExitCode.Generic);
    expect(out.join("\n")).toMatch(/not found|enoent/i);
  });
});
