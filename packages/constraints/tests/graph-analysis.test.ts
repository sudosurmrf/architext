import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";
import {
  runConstraints,
  unreachableNodes,
  deadEndServices,
  cycleDetection,
  decisionBranchCompleteness,
  disconnectedSubgraphs,
  BUILT_IN_RULES,
} from "../src";

// --- Fixture specs ---

const SPEC_CLEAN: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Clean", slug: "clean" },
  groups: [],
  services: [
    { id: "fe", name: "Frontend", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
    { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
    { id: "db", name: "DB", kind: "database", position: { x: 0, y: 0 }, components: [] },
  ],
  edges: [
    { id: "e1", from: "fe", to: "api", protocol: "http" },
    { id: "e2", from: "api", to: "db", protocol: "sql" },
  ],
};

const SPEC_CYCLE_AB: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "CycleAB", slug: "cycle-ab" },
  groups: [],
  services: [
    { id: "a", name: "A", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
    { id: "b", name: "B", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
  ],
  edges: [
    { id: "e1", from: "a", to: "b", protocol: "http" },
    { id: "e2", from: "b", to: "a", protocol: "http" },
  ],
};

const SPEC_CYCLE_ABC: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "CycleABC", slug: "cycle-abc" },
  groups: [],
  services: [
    { id: "a", name: "A", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
    { id: "b", name: "B", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
    { id: "c", name: "C", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
  ],
  edges: [
    { id: "e1", from: "a", to: "b", protocol: "http" },
    { id: "e2", from: "b", to: "c", protocol: "http" },
    { id: "e3", from: "c", to: "a", protocol: "http" },
  ],
};

const SPEC_DEAD_END: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "DeadEnd", slug: "dead-end" },
  groups: [],
  services: [
    { id: "fe", name: "Frontend", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
    { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
  ],
  edges: [{ id: "e1", from: "fe", to: "api", protocol: "http" }],
};

const SPEC_DISCONNECTED: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Disconnected", slug: "disconnected" },
  groups: [],
  services: [
    { id: "a", name: "A", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
    { id: "b", name: "B", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
    { id: "c", name: "C", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
    { id: "d", name: "D", kind: "database", position: { x: 0, y: 0 }, components: [] },
  ],
  edges: [
    { id: "e1", from: "a", to: "b", protocol: "http" },
    { id: "e2", from: "c", to: "d", protocol: "sql" },
  ],
};

const SPEC_DECISION_ONE_BRANCH: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "DecisionOne", slug: "decision-one" },
  groups: [],
  services: [
    { id: "fe", name: "Frontend", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
    { id: "dec", name: "Router", kind: "decision", position: { x: 0, y: 0 }, components: [] },
    { id: "svc", name: "Service", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
  ],
  edges: [
    { id: "e1", from: "fe", to: "dec", protocol: "http" },
    { id: "e2", from: "dec", to: "svc", protocol: "http" },
  ],
};

const SPEC_DECISION_TWO_BRANCHES: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "DecisionTwo", slug: "decision-two" },
  groups: [],
  services: [
    { id: "fe", name: "Frontend", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
    { id: "dec", name: "Router", kind: "decision", position: { x: 0, y: 0 }, components: [] },
    { id: "svc1", name: "ServiceA", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
    { id: "svc2", name: "ServiceB", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
  ],
  edges: [
    { id: "e1", from: "fe", to: "dec", protocol: "http" },
    { id: "e2", from: "dec", to: "svc1", protocol: "http" },
    { id: "e3", from: "dec", to: "svc2", protocol: "http" },
  ],
};

const SPEC_UNREACHABLE: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Unreachable", slug: "unreachable" },
  groups: [],
  services: [
    { id: "fe", name: "Frontend", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
    { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
    { id: "orphan", name: "Orphan", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
  ],
  edges: [{ id: "e1", from: "fe", to: "api", protocol: "http" }],
};

const EMPTY_SPEC: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Empty", slug: "empty" },
  groups: [],
  services: [],
  edges: [],
};

// --- Tests ---

describe("unreachableNodes", () => {
  it("no diagnostics when all services have inbound edges", () => {
    expect(unreachableNodes(SPEC_CLEAN)).toEqual([]);
  });

  it("no diagnostics for frontend-app with no inbound", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "FE", slug: "fe" },
      groups: [],
      services: [
        { id: "fe", name: "FE", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
        { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "fe", to: "api", protocol: "http" }],
    };
    const diagnostics = unreachableNodes(spec);
    expect(diagnostics.every((d) => d.location?.serviceId !== "fe")).toBe(true);
  });

  it("no diagnostics for external-api with no inbound", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "ExtAPI", slug: "ext-api" },
      groups: [],
      services: [
        { id: "ext", name: "External", kind: "external-api", position: { x: 0, y: 0 }, components: [] },
        { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "ext", to: "api", protocol: "http" }],
    };
    const diagnostics = unreachableNodes(spec);
    expect(diagnostics.every((d) => d.location?.serviceId !== "ext")).toBe(true);
  });

  it("no diagnostics for ai-agent with no inbound", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "AgentFirst", slug: "agent-first" },
      groups: [],
      services: [
        { id: "agent", name: "Agent", kind: "ai-agent", position: { x: 0, y: 0 }, components: [] },
        { id: "db", name: "DB", kind: "database", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "agent", to: "db", protocol: "sql" }],
    };
    const diagnostics = unreachableNodes(spec);
    expect(diagnostics.every((d) => d.location?.serviceId !== "agent")).toBe(true);
  });

  it("warns for backend-service with no inbound", () => {
    const diagnostics = unreachableNodes(SPEC_UNREACHABLE);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "warning",
      code: "graph.unreachable-node",
      location: { serviceId: "orphan" },
    });
  });

  it("warns for database with no inbound (not an entry point)", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "DBOrphan", slug: "db-orphan" },
      groups: [],
      services: [
        { id: "db", name: "DB", kind: "database", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [],
    };
    const diagnostics = unreachableNodes(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "warning",
      code: "graph.unreachable-node",
      location: { serviceId: "db" },
    });
  });

  it("no diagnostics for empty spec", () => {
    expect(unreachableNodes(EMPTY_SPEC)).toEqual([]);
  });
});

describe("deadEndServices", () => {
  it("no diagnostics when all services have outbound edges", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "AllOut", slug: "all-out" },
      groups: [],
      services: [
        { id: "fe", name: "FE", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
        { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "db", name: "DB", kind: "database", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [
        { id: "e1", from: "fe", to: "api", protocol: "http" },
        { id: "e2", from: "api", to: "db", protocol: "sql" },
      ],
    };
    // fe and api have outbound; db is a sink kind
    const diagnostics = deadEndServices(spec);
    expect(diagnostics).toEqual([]);
  });

  it("no diagnostics for database with no outbound", () => {
    const diagnostics = deadEndServices(SPEC_CLEAN);
    expect(diagnostics.every((d) => d.location?.serviceId !== "db")).toBe(true);
  });

  it("no diagnostics for cache with no outbound", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Cache", slug: "cache" },
      groups: [],
      services: [
        { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "cache", name: "Cache", kind: "cache", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "api", to: "cache", protocol: "http" }],
    };
    const diagnostics = deadEndServices(spec);
    expect(diagnostics.every((d) => d.location?.serviceId !== "cache")).toBe(true);
  });

  it("no diagnostics for queue with no outbound", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Queue", slug: "queue" },
      groups: [],
      services: [
        { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "q", name: "Queue", kind: "queue", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "api", to: "q", protocol: "queue" }],
    };
    const diagnostics = deadEndServices(spec);
    expect(diagnostics.every((d) => d.location?.serviceId !== "q")).toBe(true);
  });

  it("no diagnostics for human-step with no outbound", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Human", slug: "human" },
      groups: [],
      services: [
        { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "human", name: "Review", kind: "human-step", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "api", to: "human", protocol: "http" }],
    };
    const diagnostics = deadEndServices(spec);
    expect(diagnostics.every((d) => d.location?.serviceId !== "human")).toBe(true);
  });

  it("info for backend-service with no outbound", () => {
    const diagnostics = deadEndServices(SPEC_DEAD_END);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "info",
      code: "graph.dead-end",
      location: { serviceId: "api" },
    });
  });

  it("info for ai-agent with no outbound", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "AgentDeadEnd", slug: "agent-dead-end" },
      groups: [],
      services: [
        { id: "fe", name: "FE", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
        { id: "agent", name: "Agent", kind: "ai-agent", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "fe", to: "agent", protocol: "http" }],
    };
    const diagnostics = deadEndServices(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "info",
      code: "graph.dead-end",
      location: { serviceId: "agent" },
    });
  });

  it("no diagnostics for empty spec", () => {
    expect(deadEndServices(EMPTY_SPEC)).toEqual([]);
  });
});

describe("cycleDetection", () => {
  it("no diagnostics for acyclic graph", () => {
    expect(cycleDetection(SPEC_CLEAN)).toEqual([]);
  });

  it("detects simple two-node cycle (a→b, b→a)", () => {
    const diagnostics = cycleDetection(SPEC_CYCLE_AB);
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "info",
      code: "graph.cycle-detected",
    });
    expect(diagnostics[0].message).toContain("Cycle detected");
  });

  it("detects three-node cycle (a→b→c→a)", () => {
    const diagnostics = cycleDetection(SPEC_CYCLE_ABC);
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "info",
      code: "graph.cycle-detected",
    });
  });

  it("does not emit for single service with no edges", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Single", slug: "single" },
      groups: [],
      services: [{ id: "a", name: "A", kind: "backend-service", position: { x: 0, y: 0 }, components: [] }],
      edges: [],
    };
    expect(cycleDetection(spec)).toEqual([]);
  });

  it("reports multiple independent cycles separately", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "MultiCycle", slug: "multi-cycle" },
      groups: [],
      services: [
        { id: "a", name: "A", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "b", name: "B", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "c", name: "C", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "d", name: "D", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [
        { id: "e1", from: "a", to: "b", protocol: "http" },
        { id: "e2", from: "b", to: "a", protocol: "http" },
        { id: "e3", from: "c", to: "d", protocol: "http" },
        { id: "e4", from: "d", to: "c", protocol: "http" },
      ],
    };
    const diagnostics = cycleDetection(spec);
    expect(diagnostics.length).toBeGreaterThanOrEqual(2);
  });

  it("cycle involving decision node is still flagged (info, not error)", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "DecCycle", slug: "dec-cycle" },
      groups: [],
      services: [
        { id: "agent", name: "Agent", kind: "ai-agent", position: { x: 0, y: 0 }, components: [] },
        { id: "dec", name: "Decision", kind: "decision", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [
        { id: "e1", from: "agent", to: "dec", protocol: "http" },
        { id: "e2", from: "dec", to: "agent", protocol: "http" },
      ],
    };
    const diagnostics = cycleDetection(spec);
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics[0].severity).toBe("info");
  });
});

describe("decisionBranchCompleteness", () => {
  it("no diagnostics for decision node with 2 outbound edges", () => {
    expect(decisionBranchCompleteness(SPEC_DECISION_TWO_BRANCHES)).toEqual([]);
  });

  it("no diagnostics for decision node with 3+ outbound edges", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Dec3", slug: "dec3" },
      groups: [],
      services: [
        { id: "fe", name: "FE", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
        { id: "dec", name: "Dec", kind: "decision", position: { x: 0, y: 0 }, components: [] },
        { id: "s1", name: "S1", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "s2", name: "S2", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "s3", name: "S3", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [
        { id: "e1", from: "fe", to: "dec", protocol: "http" },
        { id: "e2", from: "dec", to: "s1", protocol: "http" },
        { id: "e3", from: "dec", to: "s2", protocol: "http" },
        { id: "e4", from: "dec", to: "s3", protocol: "http" },
      ],
    };
    expect(decisionBranchCompleteness(spec)).toEqual([]);
  });

  it("warns for decision node with 1 outbound edge", () => {
    const diagnostics = decisionBranchCompleteness(SPEC_DECISION_ONE_BRANCH);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "warning",
      code: "graph.decision-incomplete",
      location: { serviceId: "dec" },
    });
    expect(diagnostics[0].message).toContain("1 outbound branch(es)");
  });

  it("warns for decision node with 0 outbound edges", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Dec0", slug: "dec0" },
      groups: [],
      services: [
        { id: "dec", name: "Isolate", kind: "decision", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [],
    };
    const diagnostics = decisionBranchCompleteness(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "warning",
      code: "graph.decision-incomplete",
      location: { serviceId: "dec" },
    });
    expect(diagnostics[0].message).toContain("0 outbound branch(es)");
  });

  it("non-decision service with many outbound edges: no diagnostic", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "MultiOut", slug: "multi-out" },
      groups: [],
      services: [
        { id: "api", name: "API", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "s1", name: "S1", kind: "database", position: { x: 0, y: 0 }, components: [] },
        { id: "s2", name: "S2", kind: "database", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [
        { id: "e1", from: "api", to: "s1", protocol: "sql" },
        { id: "e2", from: "api", to: "s2", protocol: "sql" },
      ],
    };
    expect(decisionBranchCompleteness(spec)).toEqual([]);
  });
});

describe("disconnectedSubgraphs", () => {
  it("no diagnostics for single connected component", () => {
    expect(disconnectedSubgraphs(SPEC_CLEAN)).toEqual([]);
  });

  it("no diagnostics for single service", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Single", slug: "single" },
      groups: [],
      services: [{ id: "a", name: "A", kind: "backend-service", position: { x: 0, y: 0 }, components: [] }],
      edges: [],
    };
    expect(disconnectedSubgraphs(spec)).toEqual([]);
  });

  it("no diagnostics for empty spec", () => {
    expect(disconnectedSubgraphs(EMPTY_SPEC)).toEqual([]);
  });

  it("info for two disconnected pairs", () => {
    const diagnostics = disconnectedSubgraphs(SPEC_DISCONNECTED);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "info",
      code: "graph.disconnected-subgraph",
    });
    expect(diagnostics[0].message).toContain("2 disconnected components");
  });

  it("info for three completely isolated services", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "ThreeIslands", slug: "three-islands" },
      groups: [],
      services: [
        { id: "a", name: "A", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
        { id: "b", name: "B", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
        { id: "c", name: "C", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [],
    };
    const diagnostics = disconnectedSubgraphs(spec);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("3 disconnected components");
  });

  it("shows correct component count in message", () => {
    const diagnostics = disconnectedSubgraphs(SPEC_DISCONNECTED);
    expect(diagnostics[0].message).toContain("2 disconnected components");
    expect(diagnostics[0].message).toContain("sizes:");
  });
});

describe("graph rules integrated into runConstraints", () => {
  it("all five graph rules fire when using BUILT_IN_RULES", () => {
    // A spec that triggers all five rules:
    // - disconnected components
    // - unreachable orphan node
    // - cycle between two nodes
    // - decision node with one branch
    // - dead-end on the cycle node
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "AllFive", slug: "all-five" },
      groups: [],
      services: [
        { id: "fe", name: "FE", kind: "frontend-app", position: { x: 0, y: 0 }, components: [] },
        { id: "dec", name: "Dec", kind: "decision", position: { x: 0, y: 0 }, components: [] },
        { id: "svc", name: "SVC", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        // Disconnected island
        { id: "island", name: "Island", kind: "backend-service", position: { x: 0, y: 0 }, components: [] },
        { id: "island2", name: "Island2", kind: "database", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [
        { id: "e1", from: "fe", to: "dec", protocol: "http" },
        // dec has only 1 outbound (decision-incomplete)
        { id: "e2", from: "dec", to: "svc", protocol: "http" },
        // disconnected island
        { id: "e3", from: "island", to: "island2", protocol: "sql" },
      ],
    };

    const diagnostics = runConstraints(spec, BUILT_IN_RULES);
    const codes = diagnostics.map((d) => d.code);

    expect(codes).toContain("graph.disconnected-subgraph");
    expect(codes).toContain("graph.decision-incomplete");
    expect(codes).toContain("graph.dead-end");
    expect(codes).toContain("graph.unreachable-node");
  });
});
