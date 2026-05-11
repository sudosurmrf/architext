import { describe, it, expect } from "vitest";
import { loadPatterns } from "../src/load";
import { instantiatePattern } from "../src/instantiate";

describe("Agentic workflow patterns — presence", () => {
  const lib = loadPatterns();
  const ids = lib.entries.map((p) => p.id);

  it.each([
    "rag-pipeline",
    "human-in-the-loop",
    "multi-agent-orchestrator",
    "tool-using-agent-fallback",
    "autonomous-agent-loop",
  ])("pattern '%s' is registered", (id) => {
    expect(ids).toContain(id);
  });
});

describe("Agentic workflow patterns — instantiation", () => {
  const lib = loadPatterns();
  const agentic = [
    "rag-pipeline",
    "human-in-the-loop",
    "multi-agent-orchestrator",
    "tool-using-agent-fallback",
    "autonomous-agent-loop",
  ];

  for (const patternId of agentic) {
    describe(patternId, () => {
      const pattern = lib.entries.find((p) => p.id === patternId)!;
      let n = 0;
      const idGen = () => `id-${++n}`;
      const result = instantiatePattern(pattern, { x: 0, y: 0 }, idGen);

      it("produces services, edges (and groups if applicable)", () => {
        expect(result.services.length).toBeGreaterThan(0);
        expect(result.edges.length).toBeGreaterThan(0);
      });

      it("all entity IDs are unique (no collisions)", () => {
        const allIds = [
          ...result.groups.map((g) => g.id),
          ...result.services.map((s) => s.id),
          ...result.edges.map((e) => e.id),
        ];
        expect(new Set(allIds).size).toBe(allIds.length);
      });

      it("every edge.from and edge.to resolves to a real service ID", () => {
        const serviceIds = new Set(result.services.map((s) => s.id));
        for (const edge of result.edges) {
          expect(serviceIds.has(edge.from)).toBe(true);
          expect(serviceIds.has(edge.to)).toBe(true);
        }
      });
    });
  }
});

// Pattern-specific structural checks
describe("rag-pipeline specifics", () => {
  const lib = loadPatterns();
  const pattern = lib.entries.find((p) => p.id === "rag-pipeline")!;
  let n = 0;
  const result = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);

  it("has an ai-agent service", () => {
    expect(result.services.some((s) => s.kind === "ai-agent")).toBe(true);
  });

  it("has an fs edge and a key-value edge", () => {
    expect(result.edges.some((e) => e.protocol === "fs")).toBe(true);
    expect(result.edges.some((e) => e.protocol === "key-value")).toBe(true);
  });
});

describe("human-in-the-loop specifics", () => {
  const lib = loadPatterns();
  const pattern = lib.entries.find((p) => p.id === "human-in-the-loop")!;
  let n = 0;
  const result = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);

  it("has a human-step service", () => {
    expect(result.services.some((s) => s.kind === "human-step")).toBe(true);
  });

  it("has a decision service", () => {
    expect(result.services.some((s) => s.kind === "decision")).toBe(true);
  });

  it("has a human-review edge with reviewType approval", () => {
    const edge = result.edges.find((e) => e.protocol === "human-review");
    expect(edge).toBeDefined();
    expect(edge?.reviewType).toBe("approval");
  });

  it("has a fallback branch on the rejection path", () => {
    const edge = result.edges.find((e) => e.fallback === true);
    expect(edge).toBeDefined();
  });
});

describe("multi-agent-orchestrator specifics", () => {
  const lib = loadPatterns();
  const pattern = lib.entries.find((p) => p.id === "multi-agent-orchestrator")!;
  let n = 0;
  const result = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);

  it("has exactly 4 ai-agent services", () => {
    expect(result.services.filter((s) => s.kind === "ai-agent")).toHaveLength(4);
  });

  it("has a cache service (shared context store)", () => {
    expect(result.services.some((s) => s.kind === "cache")).toBe(true);
  });
});

describe("autonomous-agent-loop specifics", () => {
  const lib = loadPatterns();
  const pattern = lib.entries.find((p) => p.id === "autonomous-agent-loop")!;
  let n = 0;
  const result = instantiatePattern(pattern, { x: 0, y: 0 }, () => `id-${++n}`);

  it("has a loop-back edge (breaker → agent)", () => {
    const agentId = result.services.find((s) => s.name === "agent")?.id;
    expect(result.edges.some((e) => e.to === agentId && e.protocol === "http")).toBe(true);
  });

  it("has a decision edge from evaluator to breaker", () => {
    expect(result.edges.some((e) => e.protocol === "decision")).toBe(true);
  });
});
