import { describe, it, expect } from "vitest";
import { loadMetaPrompt } from "../src/prompt/load";
import { ApplyError, ExitCode } from "../src/errors";

describe("loadMetaPrompt", () => {
  it("loads the v0.1.0 prompt content", () => {
    const text = loadMetaPrompt("0.1.0");
    expect(text).toContain("# Architext Scaffold Prompt v0.1.0");
    expect(text).toContain("ARCHITEXT_DONE");
    expect(text).toContain("ARCHITEXT_FAILED");
  });

  it("throws ApplyError with SpecInvalid code for unknown versions", () => {
    let caught: unknown;
    try {
      loadMetaPrompt("9.9.9");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApplyError);
    expect((caught as ApplyError).code).toBe(ExitCode.SpecInvalid);
    expect((caught as ApplyError).message).toMatch(/9\.9\.9/);
    expect((caught as ApplyError).message).toMatch(/upgrade/i);
  });
});
