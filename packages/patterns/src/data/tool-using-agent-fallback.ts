import { PatternSchema, type Pattern } from "../types";

export const toolUsingAgentFallback: Pattern = PatternSchema.parse({
  id: "tool-using-agent-fallback",
  name: "Tool-Using Agent with Fallback",
  description: "Primary AI agent calls external tools; a decision node routes failures to a fallback agent.",
  preview: "agent → tools; agent → decision → fallback-agent",
  fragment: {
    groups: [{ name: "Agent System", kind: "ai-workflow", tmpId: "g-sys" }],
    services: [
      { name: "primary-agent",  kind: "ai-agent",     tmpId: "agent",    tmpGroupId: "g-sys", offset: { x: 0,   y: 100 } },
      { name: "tool-api",       kind: "external-api",  tmpId: "tools",    tmpGroupId: "g-sys", offset: { x: 300, y: 0   } },
      { name: "failure-router", kind: "decision",      tmpId: "router",   tmpGroupId: "g-sys", offset: { x: 300, y: 200 } },
      { name: "fallback-agent", kind: "ai-agent",      tmpId: "fallback", tmpGroupId: "g-sys", offset: { x: 600, y: 200 } },
    ],
    edges: [
      { from: "agent",  to: "tools",    protocol: "http",     basePath: "/tools" },
      { from: "agent",  to: "router",   protocol: "decision", condition: "error != null", branchLabel: "on-failure" },
      { from: "router", to: "fallback", protocol: "http",     fallback: true },
    ],
  },
});
