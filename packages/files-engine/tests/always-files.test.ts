import { describe, it, expect } from "vitest";
import { alwaysFiles } from "../src/always-files";

describe("alwaysFiles", () => {
  it("always includes architext-spec.json, README.md, .gitignore", () => {
    const paths = alwaysFiles();
    expect(paths).toContain("architext-spec.json");
    expect(paths).toContain("README.md");
    expect(paths).toContain(".gitignore");
  });

  it("returns paths in sorted order", () => {
    const paths = alwaysFiles();
    const sorted = [...paths].sort();
    expect(paths).toEqual(sorted);
  });
});
