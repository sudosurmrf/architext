import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";
import { buildUndirectedList, findComponents } from "../graph-utils";

export const disconnectedSubgraphs = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  if (spec.services.length < 2) return [];

  const undirected = buildUndirectedList(spec);
  const serviceIds = spec.services.map((s) => s.id);
  const serviceNameById = new Map(spec.services.map((s) => [s.id, s.name]));

  const components = findComponents(serviceIds, undirected);
  if (components.length <= 1) return [];

  const componentSizes = components.map((c) => c.size);

  return [
    {
      severity: "info",
      code: "graph.disconnected-subgraph",
      message: `The service graph has ${components.length} disconnected components (sizes: ${componentSizes.join(", ")}). These groups have no edges between them.`,
      suggestion:
        "If these are independent subsystems, this is intentional. Otherwise, add edges to connect the subgraphs.",
    },
  ];
};
