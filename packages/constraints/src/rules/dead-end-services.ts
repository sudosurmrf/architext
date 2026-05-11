import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";
import { buildOutboundList } from "../graph-utils";

const SINK_KINDS = new Set(["database", "cache", "queue", "human-step"]);

export const deadEndServices = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  if (spec.services.length === 0) return [];

  const outbound = buildOutboundList(spec);
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const service of spec.services) {
    const neighbors = outbound.get(service.id);
    if (neighbors && neighbors.size === 0 && !SINK_KINDS.has(service.kind)) {
      diagnostics.push({
        severity: "info",
        code: "graph.dead-end",
        message: `Service "${service.name}" has no outbound edges. The workflow stops here.`,
        location: { serviceId: service.id },
        suggestion: `Add an outbound connection from "${service.name}" or verify this is intentionally a terminal node.`,
      });
    }
  }

  return diagnostics;
};
