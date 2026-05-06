import { describe, it, expect } from "vitest";
import { buildPrompt } from "../src/prompt/build";
import type { ArchitextSpec } from "@architext/schema";

const minimalSpec: ArchitextSpec = {
  schemaVersion: "0.1.0",
  project: { name: "Test", slug: "test" },
  groups: [],
  services: [],
  edges: [],
};

describe("buildPrompt", () => {
  it("contains the meta-prompt followed by the spec JSON", () => {
    const out = buildPrompt("META PROMPT BODY", minimalSpec);
    expect(out).toContain("META PROMPT BODY");
    expect(out).toContain('"schemaVersion": "0.1.0"');
    expect(out).toContain('"slug": "test"');
    expect(out.indexOf("META PROMPT BODY")).toBeLessThan(out.indexOf('"schemaVersion"'));
  });

  it("appends optional --instructions block when provided", () => {
    const out = buildPrompt("META", minimalSpec, "use bun instead of node");
    expect(out).toContain("Additional Instructions");
    expect(out).toContain("use bun instead of node");
    expect(out.indexOf("Additional Instructions")).toBeLessThan(out.indexOf('"schemaVersion"'));
  });

  it("omits the instructions section when no instructions are passed", () => {
    const out = buildPrompt("META", minimalSpec);
    expect(out).not.toContain("Additional Instructions");
  });

  it("emits the spec inside a fenced JSON code block", () => {
    const out = buildPrompt("META", minimalSpec);
    expect(out).toMatch(/```json\n[\s\S]+\n```/);
  });
});
