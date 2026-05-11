import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";

export const contractSchemaMatchRule = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  const serviceById = new Map(spec.services.map((s) => [s.id, s]));
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const edge of spec.edges) {
    const sourceService = serviceById.get(edge.from);
    const targetService = serviceById.get(edge.to);

    const outboundContract = sourceService?.contracts?.find(
      (c) => c.edgeId === edge.id && c.direction === "outbound",
    );
    const inboundContract = targetService?.contracts?.find(
      (c) => c.edgeId === edge.id && c.direction === "inbound",
    );

    const sourceSchema = outboundContract?.schema;
    const targetSchema = inboundContract?.schema;

    if (sourceSchema && targetSchema) {
      if (sourceSchema !== targetSchema) {
        const truncate = (s: string) => (s.length > 60 ? s.slice(0, 57) + "..." : s);
        diagnostics.push({
          severity: "warning",
          code: "edge.contract-schema-mismatch",
          message: `Edge "${edge.id}" has mismatched schemas: source outbound is "${truncate(sourceSchema)}" but target inbound is "${truncate(targetSchema)}".`,
          location: { edgeId: edge.id },
          suggestion:
            "Align the source outbound schema with the target inbound schema, or remove one of the schema fields if the contracts are not formally linked.",
        });
      }
    } else if (sourceSchema && !targetSchema && inboundContract) {
      diagnostics.push({
        severity: "info",
        code: "edge.contract-schema-one-sided",
        message: `Edge "${edge.id}" has a schema on the source outbound contract but the target inbound contract has no schema.`,
        location: { edgeId: edge.id },
        suggestion:
          "Add a schema to the target inbound contract to document the expected interface, or remove the source schema if the contracts are not formally linked.",
      });
    } else if (!sourceSchema && targetSchema && outboundContract) {
      diagnostics.push({
        severity: "info",
        code: "edge.contract-schema-one-sided",
        message: `Edge "${edge.id}" has a schema on the target inbound contract but the source outbound contract has no schema.`,
        location: { edgeId: edge.id },
        suggestion:
          "Add a schema to the source outbound contract to document the expected interface, or remove the target schema if the contracts are not formally linked.",
      });
    }
  }

  return diagnostics;
};
