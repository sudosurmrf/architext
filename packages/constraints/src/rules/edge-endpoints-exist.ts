import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";

export const edgeEndpointsExist = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  const serviceIds = new Set(spec.services.map((s) => s.id));
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const edge of spec.edges) {
    if (!serviceIds.has(edge.from)) {
      diagnostics.push({
        severity: "error",
        code: "edge.endpoint-not-found",
        message: `Edge "${edge.id}" references nonexistent source service "${edge.from}".`,
        location: { edgeId: edge.id },
        suggestion: `Add a service with id "${edge.from}" or update the edge's "from" field.`,
      });
    }
    if (!serviceIds.has(edge.to)) {
      diagnostics.push({
        severity: "error",
        code: "edge.endpoint-not-found",
        message: `Edge "${edge.id}" references nonexistent target service "${edge.to}".`,
        location: { edgeId: edge.id },
        suggestion: `Add a service with id "${edge.to}" or update the edge's "to" field.`,
      });
    }
  }

  return diagnostics;
};
