import { describe, expect, it } from "vitest";
import type { ArchitextSpec } from "@architext/schema";
import { buildWorkflowContractPreview } from "../src/lib/workflow-contract";

describe("buildWorkflowContractPreview", () => {
  it("compiles a manifest from exported compact ids", () => {
    const spec: ArchitextSpec = {
      schemaVersion: "0.1.0",
      project: {
        name: "AI Flow",
        slug: "ai-flow",
        businessContext: { purpose: "Review generated research before delivery." },
      },
      groups: [],
      services: [
        {
          id: "uuid-agent",
          name: "Research Agent",
          kind: "ai-agent",
          businessContext: { purpose: "Draft research summaries." },
          position: { x: 0, y: 0 },
          components: [],
        },
        {
          id: "uuid-review",
          name: "Human Review",
          kind: "human-step",
          position: { x: 0, y: 0 },
          components: [],
        },
      ],
      edges: [
        {
          id: "uuid-edge",
          from: "uuid-agent",
          to: "uuid-review",
          protocol: "human-review",
          instructions: "Approve before sending.",
          businessContext: { acceptanceCriteria: ["Reviewer confirms the summary is accurate."] },
        },
      ],
    };

    const preview = buildWorkflowContractPreview(spec);
    expect(preview.manifest.nodes.map((node) => node.id)).toEqual(["research-agent", "human-review"]);
    expect(preview.exportedSpec.project.businessContext?.purpose).toBe("Review generated research before delivery.");
    expect(preview.manifest.nodes[0]?.businessContext?.purpose).toBe("Draft research summaries.");
    expect(preview.manifest.humanGates[0]?.from).toBe("research-agent");
    expect(preview.manifest.humanGates[0]?.businessContext?.acceptanceCriteria).toEqual(["Reviewer confirms the summary is accurate."]);
    expect(preview.manifest.expectedFiles).toContain("architext-workflow.json");
    expect(preview.manifest.expectedFiles).toContain("workflow/index.ts");
    expect(preview.summary).toContain("Human gates: 1");
    expect(preview.completenessScore).toBeLessThanOrEqual(100);
  });
});
