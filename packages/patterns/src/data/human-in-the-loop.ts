import { PatternSchema, type Pattern } from "../types";

export const humanInTheLoop: Pattern = PatternSchema.parse({
  id: "human-in-the-loop",
  name: "Human-in-the-Loop Approval",
  description: "AI agent output routed through a human review gate with approve/reject branching.",
  preview: "agent → reviewer → decision → approved | rejected",
  fragment: {
    groups: [{ name: "Review Flow", kind: "ai-workflow", tmpId: "g-review" }],
    services: [
      { name: "agent",    kind: "ai-agent",        tmpId: "agent",    tmpGroupId: "g-review", offset: { x: 0,   y: 100 } },
      { name: "reviewer", kind: "human-step",       tmpId: "reviewer", tmpGroupId: "g-review", offset: { x: 300, y: 100 } },
      { name: "router",   kind: "decision",         tmpId: "router",   tmpGroupId: "g-review", offset: { x: 600, y: 100 } },
      { name: "approved", kind: "backend-service",  tmpId: "approved", tmpGroupId: "g-review", offset: { x: 900, y: 0   } },
      { name: "rejected", kind: "backend-service",  tmpId: "rejected", tmpGroupId: "g-review", offset: { x: 900, y: 200 } },
    ],
    edges: [
      { from: "agent",    to: "reviewer", protocol: "human-review", reviewType: "approval", sla: "24h" },
      { from: "reviewer", to: "router",   protocol: "decision",     condition: "approved == true" },
      { from: "router",   to: "approved", protocol: "decision",     branchLabel: "approved" },
      { from: "router",   to: "rejected", protocol: "decision",     branchLabel: "rejected", fallback: true },
    ],
  },
});
