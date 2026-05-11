import type { ArchitextSpec } from "@architext/schema";
import type { ServiceKind } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";

const PROTOCOL_TARGET_KINDS: Partial<Record<string, ServiceKind[]>> = {
  sql: ["database"],
  "key-value": ["cache"],
  "object-storage": ["infrastructure", "external-api"],
  dns: ["infrastructure", "external-api"],
  "container-image": ["infrastructure", "sidecar"],
  identity: ["infrastructure", "external-api"],
  secret: ["infrastructure"],
};

// Either source or target must be one of the listed kinds
const PROTOCOL_ENDPOINT_KINDS: Partial<Record<string, ServiceKind[]>> = {
  queue: ["queue"],
  "human-review": ["human-step"],
  decision: ["decision"],
  "lambda-invoke": ["infrastructure", "external-api"],
};

export const protocolKindCompatRule = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  const serviceKindById = new Map(spec.services.map((s) => [s.id, s.kind]));
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const edge of spec.edges) {
    const protocol = edge.protocol;
    const sourceKind = serviceKindById.get(edge.from);
    const targetKind = serviceKindById.get(edge.to);

    const targetConstraint = PROTOCOL_TARGET_KINDS[protocol];
    if (targetConstraint && targetKind !== undefined) {
      if (!targetConstraint.includes(targetKind)) {
        diagnostics.push({
          severity: "error",
          code: "edge.protocol-kind-mismatch",
          message: `Edge "${edge.id}" uses protocol "${protocol}" but target service "${edge.to}" has kind "${targetKind}". Expected one of: ${targetConstraint.join(", ")}.`,
          location: { edgeId: edge.id },
          suggestion: `The target service for a "${protocol}" edge must be one of: ${targetConstraint.join(", ")}.`,
        });
      }
    }

    const endpointConstraint = PROTOCOL_ENDPOINT_KINDS[protocol];
    if (endpointConstraint) {
      const sourceOk = sourceKind !== undefined && endpointConstraint.includes(sourceKind);
      const targetOk = targetKind !== undefined && endpointConstraint.includes(targetKind);
      if (!sourceOk && !targetOk) {
        diagnostics.push({
          severity: "error",
          code: "edge.protocol-kind-mismatch",
          message: `Edge "${edge.id}" uses protocol "${protocol}" but neither endpoint has the required kind. Expected source or target to be one of: ${endpointConstraint.join(", ")}.`,
          location: { edgeId: edge.id },
          suggestion: `At least one endpoint of a "${protocol}" edge must be one of: ${endpointConstraint.join(", ")}.`,
        });
      }
    }
  }

  return diagnostics;
};
