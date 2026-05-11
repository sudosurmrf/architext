import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";

export const noDuplicateIds = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  const seen = new Map<string, string>();
  const diagnostics: ConstraintDiagnostic[] = [];

  const check = (id: string, entityType: string) => {
    const existing = seen.get(id);
    if (existing) {
      diagnostics.push({
        severity: "error",
        code: "spec.duplicate-id",
        message: `ID "${id}" is used by both a ${existing} and a ${entityType}.`,
        suggestion: `Rename one of the entities with id "${id}" to make all IDs unique.`,
      });
    } else {
      seen.set(id, entityType);
    }
  };

  for (const group of spec.groups) check(group.id, "group");
  for (const service of spec.services) check(service.id, "service");
  for (const edge of spec.edges) check(edge.id, "edge");

  return diagnostics;
};
