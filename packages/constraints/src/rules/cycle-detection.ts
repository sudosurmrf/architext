import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";
import { buildOutboundList, detectCycles } from "../graph-utils";

export const cycleDetection = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  if (spec.services.length === 0) return [];

  const outbound = buildOutboundList(spec);
  const serviceIds = spec.services.map((s) => s.id);
  const serviceNameById = new Map(spec.services.map((s) => [s.id, s.name]));

  const cycles = detectCycles(serviceIds, outbound);
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const cycle of cycles) {
    const names = cycle.map((id) => serviceNameById.get(id) ?? id);
    const truncated = names.length > 6 ? [...names.slice(0, 6), "..."] : names;
    const cycleStr = truncated.join(" → ");

    diagnostics.push({
      severity: "info",
      code: "graph.cycle-detected",
      message: `Cycle detected: ${cycleStr} → (back to start). Ensure a termination condition exists.`,
      suggestion:
        "Add a decision node with a 'stop' branch to break the cycle, or verify the loop has a finite exit condition.",
    });
  }

  return diagnostics;
};
