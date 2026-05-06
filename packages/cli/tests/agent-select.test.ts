import { describe, it, expect } from "vitest";
import { selectBackend } from "../src/agent/select";
import { ApplyError, ExitCode } from "../src/errors";

describe("selectBackend", () => {
  it("returns a claude-code backend by default", () => {
    const b = selectBackend("claude-code");
    expect(b.name).toBe("claude-code");
  });

  it("returns a mock backend when requested", () => {
    const b = selectBackend("mock");
    expect(b.name).toBe("mock");
  });

  it("throws ApplyError(Generic) for archon (reserved, not yet implemented)", () => {
    let caught: unknown;
    try {
      selectBackend("archon");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApplyError);
    expect((caught as ApplyError).code).toBe(ExitCode.Generic);
    expect((caught as ApplyError).message).toMatch(/archon/i);
    expect((caught as ApplyError).message).toMatch(/not.*implemented/i);
  });

  it("throws ApplyError(Generic) for unknown names", () => {
    let caught: unknown;
    try {
      selectBackend("gemini");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApplyError);
    expect((caught as ApplyError).code).toBe(ExitCode.Generic);
    expect((caught as ApplyError).message).toMatch(/gemini/);
  });
});
