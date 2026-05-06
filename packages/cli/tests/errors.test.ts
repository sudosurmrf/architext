import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ExitCode, ApplyError, formatZodError } from "../src/errors";

describe("ExitCode", () => {
  it("has the documented codes", () => {
    expect(ExitCode.Success).toBe(0);
    expect(ExitCode.Generic).toBe(1);
    expect(ExitCode.SpecInvalid).toBe(2);
    expect(ExitCode.AgentNotInstalled).toBe(3);
    expect(ExitCode.TargetExists).toBe(4);
    expect(ExitCode.AgentCrashed).toBe(5);
    expect(ExitCode.AgentFailedSentinel).toBe(6);
  });
});

describe("ApplyError", () => {
  it("carries an exit code and message", () => {
    const err = new ApplyError(ExitCode.TargetExists, "dir already exists: my-app");
    expect(err.code).toBe(ExitCode.TargetExists);
    expect(err.message).toBe("dir already exists: my-app");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("formatZodError", () => {
  const Schema = z.object({
    a: z.object({ b: z.string().min(3) }),
  });

  it("renders one line per issue with dotted path", () => {
    const result = Schema.safeParse({ a: { b: "x" } });
    if (result.success) throw new Error("expected fail");
    const text = formatZodError(result.error);
    expect(text).toContain("a.b");
    expect(text).toMatch(/at least 3/i);
  });

  it("returns empty string for empty issues array", () => {
    expect(formatZodError({ issues: [] } as unknown as z.ZodError)).toBe("");
  });
});
