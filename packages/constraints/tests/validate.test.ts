import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";
import { compileWorkflowManifest, validateWorkflowManifest, constraintCompletenessScore } from "../src";

describe("validateWorkflowManifest", () => {
  it("reports practical constraint gaps", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Gaps", slug: "gaps" },
      groups: [],
      services: [
        {
          id: "agent",
          name: "agent",
          kind: "ai-agent",
          position: { x: 0, y: 0 },
          components: [],
          contracts: [{ id: "payload", name: "Payload", direction: "inbound" }],
        },
        { id: "router", name: "router", kind: "decision", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "e1", from: "agent", to: "router", protocol: "decision" }],
    };

    const diagnostics = validateWorkflowManifest(compileWorkflowManifest(spec));
    expect(diagnostics.map((d) => d.code)).toEqual(
      expect.arrayContaining([
        "contract.missing_schema",
        "decision.unnamed_branch",
        "decision.missing_business_logic",
        "agent.no_model",
        "agent.missing_purpose",
      ])
    );
    expect(constraintCompletenessScore(diagnostics)).toBeLessThan(100);
  });

  it("reports missing business meaning on shaped contracts and approval gates", () => {
    const spec: ArchitextSpec = {
      schemaVersion: SCHEMA_VERSION,
      project: { name: "Meaning", slug: "meaning" },
      groups: [],
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          position: { x: 0, y: 0 },
          components: [],
          contracts: [{ id: "payload", name: "Payload", direction: "outbound", schema: "{\"type\":\"object\"}" }],
        },
        { id: "review", name: "review", kind: "human-step", position: { x: 0, y: 0 }, components: [] },
      ],
      edges: [{ id: "review-edge", from: "api", to: "review", protocol: "human-review", instructions: "Check the payload." }],
    };

    const diagnostics = validateWorkflowManifest(compileWorkflowManifest(spec));
    expect(diagnostics.map((d) => d.code)).toEqual(
      expect.arrayContaining(["contract.missing_business_meaning", "human_gate.missing_approval_criteria"])
    );
  });
});
