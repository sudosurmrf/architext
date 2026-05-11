import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";
import { buildInboundList } from "../graph-utils";

const ENTRY_POINT_KINDS = new Set(["frontend-app", "external-api", "ai-agent"]);

export const unreachableNodes = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  if (spec.services.length === 0) return [];

  const inbound = buildInboundList(spec);
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const service of spec.services) {
    const neighbors = inbound.get(service.id);
    if (neighbors && neighbors.size === 0 && !ENTRY_POINT_KINDS.has(service.kind)) {
      diagnostics.push({
        severity: "warning",
        code: "graph.unreachable-node",
        message: `Service "${service.name}" has no inbound edges and is not an entry point. It will never receive data.`,
        location: { serviceId: service.id },
        suggestion: `Connect an upstream service to "${service.name}" or mark it as an entry point (frontend-app, external-api, ai-agent).`,
      });
    }
  }

  return diagnostics;
};
