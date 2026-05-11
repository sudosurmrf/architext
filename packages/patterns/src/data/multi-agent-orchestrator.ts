import { PatternSchema, type Pattern } from "../types";

export const multiAgentOrchestrator: Pattern = PatternSchema.parse({
  id: "multi-agent-orchestrator",
  name: "Multi-Agent Orchestrator",
  description: "Orchestrator agent fans out tasks to specialist agents sharing a context store.",
  preview: "orchestrator → [research | code | review] ↔ context-store",
  fragment: {
    groups: [{ name: "Agent Team", kind: "ai-workflow", tmpId: "g-team" }],
    services: [
      { name: "orchestrator",   kind: "ai-agent", tmpId: "orchestrator", tmpGroupId: "g-team", offset: { x: 0,   y: 150 } },
      { name: "research-agent", kind: "ai-agent", tmpId: "research",     tmpGroupId: "g-team", offset: { x: 350, y: 0   } },
      { name: "code-agent",     kind: "ai-agent", tmpId: "code",         tmpGroupId: "g-team", offset: { x: 350, y: 150 } },
      { name: "review-agent",   kind: "ai-agent", tmpId: "review",       tmpGroupId: "g-team", offset: { x: 350, y: 300 } },
      { name: "context-store",  kind: "cache",    tmpId: "ctx",          tmpGroupId: "g-team", offset: { x: 700, y: 150 } },
    ],
    edges: [
      { from: "orchestrator", to: "research", protocol: "http",      basePath: "/research" },
      { from: "orchestrator", to: "code",     protocol: "http",      basePath: "/code" },
      { from: "orchestrator", to: "review",   protocol: "http",      basePath: "/review" },
      { from: "research",     to: "ctx",      protocol: "key-value", namespace: "context" },
      { from: "code",         to: "ctx",      protocol: "key-value", namespace: "context" },
      { from: "review",       to: "ctx",      protocol: "key-value", namespace: "context" },
    ],
  },
});
