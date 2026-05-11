import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";

export const missingContractsRule = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const edge of spec.edges) {
    const hasAnyContract = spec.services.some((service) =>
      service.contracts?.some((c) => c.edgeId === edge.id),
    );

    if (!hasAnyContract) {
      diagnostics.push({
        severity: "info",
        code: "edge.missing-contracts",
        message: `Edge "${edge.id}" has no contracts defined on either endpoint.`,
        location: { edgeId: edge.id },
        suggestion: `Add inbound/outbound contracts to the source and target services with \`edgeId: "${edge.id}"\` to document and validate this interface.`,
      });
    }
  }

  return diagnostics;
};
