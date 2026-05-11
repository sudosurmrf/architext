import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";

const HTTP_FAMILY_PROTOCOLS = new Set(["http", "graphql", "grpc", "websocket"]);

export const portPathConsistencyRule = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  const serviceById = new Map(spec.services.map((s) => [s.id, s]));
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const edge of spec.edges) {
    if (!HTTP_FAMILY_PROTOCOLS.has(edge.protocol)) continue;

    // Only http/graphql/grpc/websocket have `port` in their discriminated union types
    const edgePort = (edge as { port?: number }).port;
    if (edgePort === undefined) continue;

    const targetService = serviceById.get(edge.to);
    if (!targetService) continue;

    const entryPoints = targetService.components.filter((c) => c.category === "entry-point");
    for (const component of entryPoints) {
      const componentPort = component.config?.port;
      if (typeof componentPort !== "number") continue;

      if (componentPort !== edgePort) {
        diagnostics.push({
          severity: "warning",
          code: "edge.port-mismatch",
          message: `Edge "${edge.id}" port ${edgePort} does not match entry-point component port ${componentPort} on service "${edge.to}".`,
          location: { edgeId: edge.id, serviceId: edge.to, componentId: component.id },
          suggestion:
            "Update the edge's port or the entry-point component's config to use the same port.",
        });
      }
    }
  }

  return diagnostics;
};
