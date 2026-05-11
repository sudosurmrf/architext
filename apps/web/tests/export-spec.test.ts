import { describe, expect, it } from "vitest";
import type { ArchitextSpec } from "@architext/schema";
import { prepareForExport } from "../src/lib/export-spec";

describe("prepareForExport", () => {
  it("preserves business context while compacting ids and stripping layout", () => {
    const spec: ArchitextSpec = {
      schemaVersion: "0.1.0",
      project: {
        name: "Context App",
        slug: "context-app",
        businessContext: { purpose: "Capture user intent for generated code." },
      },
      groups: [
        {
          id: "group-uuid",
          name: "Backend",
          kind: "backend",
          position: { x: 10, y: 20 },
          size: { width: 300, height: 200 },
          serviceIds: ["service-uuid"],
          businessContext: { businessRules: ["Backend owns validation."] },
        },
      ],
      services: [
        {
          id: "service-uuid",
          name: "API",
          kind: "backend-service",
          groupId: "group-uuid",
          position: { x: 30, y: 40 },
          businessContext: { purpose: "Validate and persist tasks." },
          components: [
            {
              id: "express",
              category: "framework",
              businessContext: { purpose: "Expose HTTP routes." },
            },
          ],
          contracts: [
            {
              id: "contract-1",
              name: "Create Task",
              edgeId: "edge-uuid",
              direction: "inbound",
              schema: "{\"type\":\"object\"}",
              businessContext: { acceptanceCriteria: ["Reject empty titles."] },
            },
          ],
        },
      ],
      edges: [
        {
          id: "edge-uuid",
          from: "service-uuid",
          to: "service-uuid",
          protocol: "http",
          businessContext: { purpose: "Submit task writes." },
        },
      ],
    };

    const exported = prepareForExport(spec);
    expect(exported.project.businessContext?.purpose).toBe("Capture user intent for generated code.");
    expect(exported.groups[0]).not.toHaveProperty("position");
    expect(exported.groups[0]?.businessContext?.businessRules).toEqual(["Backend owns validation."]);
    expect(exported.services[0]).not.toHaveProperty("position");
    expect(exported.services[0]?.groupId).toBe("backend");
    expect(exported.services[0]?.businessContext?.purpose).toBe("Validate and persist tasks.");
    expect(exported.services[0]?.components[0]?.businessContext?.purpose).toBe("Expose HTTP routes.");
    expect(exported.services[0]?.contracts?.[0]?.businessContext?.acceptanceCriteria).toEqual(["Reject empty titles."]);
    expect(exported.edges[0]?.businessContext?.purpose).toBe("Submit task writes.");
  });
});
