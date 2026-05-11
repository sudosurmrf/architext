import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";
import { compileWorkflowManifest } from "../src/compile";

const baseSpec: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Workflow", slug: "workflow" },
  groups: [],
  services: [],
  edges: [],
};

describe("compileWorkflowManifest", () => {
  it("compiles a deterministic minimal manifest for non-AI specs", () => {
    const a = compileWorkflowManifest(baseSpec);
    const b = compileWorkflowManifest(baseSpec);
    expect(a).toEqual(b);
    expect(a.manifestVersion).toBe("0.1.0");
    expect(a.expectedFiles).toContain("architext-workflow.json");
    expect(a.runtimeHints.runtime).toBe("none");
  });

  it("compiles AI agents, models, human gates, and decisions", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      project: {
        ...baseSpec.project,
        businessContext: {
          purpose: "Route research work through a supervised AI workflow.",
        },
      },
      services: [
        {
          id: "agent",
          name: "research-agent",
          kind: "ai-agent",
          businessContext: {
            purpose: "Draft research summaries for analyst review.",
            businessRules: ["Never publish without approval."],
          },
          position: { x: 0, y: 0 },
          components: [
            {
              id: "http-route",
              category: "entry-point",
              businessContext: { purpose: "Expose a typed intake route." },
            },
          ],
          contracts: [
            {
              id: "agent-out",
              name: "Agent Output",
              edgeId: "e-review",
              direction: "outbound",
              contentType: "application/json",
              schema: "{\"type\":\"object\"}",
              businessContext: {
                purpose: "Carries the agent draft and confidence score.",
              },
            },
          ],
        },
        {
          id: "model",
          name: "claude",
          kind: "ai-model",
          businessContext: { purpose: "Generate structured research drafts." },
          position: { x: 0, y: 0 },
          components: [{ id: "anthropic-claude-sonnet", category: "ai", config: { provider: "anthropic", model: "claude-sonnet" } }],
        },
        {
          id: "approval",
          name: "approval",
          kind: "human-step",
          position: { x: 0, y: 0 },
          components: [],
        },
        {
          id: "router",
          name: "router",
          kind: "decision",
          position: { x: 0, y: 0 },
          components: [],
        },
      ],
      edges: [
        { id: "e-model", from: "agent", to: "model", protocol: "http", basePath: "/invoke" },
        {
          id: "e-review",
          from: "agent",
          to: "approval",
          protocol: "human-review",
          reviewType: "approval",
          instructions: "Approve safe outputs.",
          businessContext: { acceptanceCriteria: ["Reviewer approves factuality."] },
        },
        {
          id: "e-decision",
          from: "approval",
          to: "router",
          protocol: "decision",
          condition: "approved === true",
          branchLabel: "approved",
          fallback: true,
          businessContext: { businessRules: ["Only approved payloads continue."] },
        },
      ],
    };

    const manifest = compileWorkflowManifest(spec);
    expect(manifest.agents[0]).toMatchObject({ id: "agent:agent", modelIds: ["model:model"], businessContext: { purpose: "Draft research summaries for analyst review." } });
    expect(manifest.models[0]).toMatchObject({ provider: "anthropic", model: "claude-sonnet", businessContext: { purpose: "Generate structured research drafts." } });
    expect(manifest.nodes.find((node) => node.id === "agent")).toMatchObject({
      businessContext: { purpose: "Draft research summaries for analyst review." },
      componentContexts: [{ id: "http-route", businessContext: { purpose: "Expose a typed intake route." } }],
    });
    expect(manifest.edges.find((edge) => edge.id === "e-review")).toMatchObject({ businessContext: { acceptanceCriteria: ["Reviewer approves factuality."] } });
    expect(manifest.humanGates[0]).toMatchObject({ id: "human:e-review", reviewType: "approval", businessContext: { acceptanceCriteria: ["Reviewer approves factuality."] } });
    expect(manifest.decisions[0]).toMatchObject({ id: "decision:e-decision", condition: "approved === true", fallback: true, businessContext: { businessRules: ["Only approved payloads continue."] } });
    expect(manifest.contracts.map((contract) => contract.id)).toContain("agent-out");
    expect(manifest.contracts.find((contract) => contract.id === "agent-out")).toMatchObject({ businessContext: { purpose: "Carries the agent draft and confidence score." } });
    expect(manifest.runtimeHints.runtime).toBe("langgraph-ts");
    expect(manifest.expectedFiles).toContain("workflow/index.ts");
  });
});
