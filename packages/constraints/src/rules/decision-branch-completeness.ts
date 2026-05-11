import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";

export const decisionBranchCompleteness = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  const decisionServices = spec.services.filter((s) => s.kind === "decision");
  if (decisionServices.length === 0) return [];

  const diagnostics: ConstraintDiagnostic[] = [];

  for (const service of decisionServices) {
    const count = spec.edges.filter((e) => e.from === service.id).length;
    if (count < 2) {
      diagnostics.push({
        severity: "warning",
        code: "graph.decision-incomplete",
        message: `Decision service "${service.name}" has only ${count} outbound branch(es). A decision node needs at least 2 branches.`,
        location: { serviceId: service.id },
        suggestion: `Add at least one more outbound edge from "${service.name}" so it can route to different paths.`,
      });
    }
  }

  return diagnostics;
};
