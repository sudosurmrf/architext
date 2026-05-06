import { describe, it, expect } from "vitest";
import { loadPatterns } from "../src/load";

describe("Patterns invariants (v1 data)", () => {
  const lib = loadPatterns();

  it("contains at least 5 patterns (v1 scope)", () => {
    expect(lib.entries.length).toBeGreaterThanOrEqual(5);
  });

  it("has unique ids", () => {
    const ids = lib.entries.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has the v1-required pattern ids", () => {
    const ids = lib.entries.map((p) => p.id);
    expect(ids).toContain("rest-api-with-db");
    expect(ids).toContain("frontend-backend-db");
    expect(ids).toContain("worker-queue");
    expect(ids).toContain("cached-api");
    expect(ids).toContain("microservices-skeleton");
  });
});
