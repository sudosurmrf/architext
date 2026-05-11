import { PatternSchema, type Pattern } from "../types";

export const autonomousAgentLoop: Pattern = PatternSchema.parse({
  id: "autonomous-agent-loop",
  name: "Autonomous Agent Loop",
  description: "Agent refines output iteratively; an evaluation step and circuit-breaker decision prevent runaway loops.",
  preview: "agent → evaluator → circuit-breaker → (continue → agent | stop → output)",
  fragment: {
    groups: [{ name: "Agent Loop", kind: "ai-workflow", tmpId: "g-loop" }],
    services: [
      { name: "agent",           kind: "ai-agent",        tmpId: "agent",     tmpGroupId: "g-loop", offset: { x: 0,   y: 100 } },
      { name: "evaluator",       kind: "ai-model",        tmpId: "evaluator", tmpGroupId: "g-loop", offset: { x: 300, y: 100 } },
      { name: "circuit-breaker", kind: "decision",        tmpId: "breaker",   tmpGroupId: "g-loop", offset: { x: 600, y: 100 } },
      { name: "output",          kind: "backend-service", tmpId: "output",    tmpGroupId: "g-loop", offset: { x: 900, y: 0   } },
    ],
    edges: [
      { from: "agent",     to: "evaluator", protocol: "http",     basePath: "/evaluate" },
      { from: "evaluator", to: "breaker",   protocol: "decision", condition: "quality >= threshold" },
      { from: "breaker",   to: "agent",     protocol: "http",     branchLabel: "continue" },
      { from: "breaker",   to: "output",    protocol: "http",     branchLabel: "stop" },
    ],
  },
});
