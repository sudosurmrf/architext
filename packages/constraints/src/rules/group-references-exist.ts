import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";

export const groupReferencesExist = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  const serviceIds = new Set(spec.services.map((s) => s.id));
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const group of spec.groups) {
    for (const sid of group.serviceIds) {
      if (!serviceIds.has(sid)) {
        diagnostics.push({
          severity: "error",
          code: "group.service-not-found",
          message: `Group "${group.name}" references nonexistent service "${sid}".`,
          location: { groupId: group.id },
          suggestion: `Add a service with id "${sid}" or remove it from the group's serviceIds.`,
        });
      }
    }
  }

  return diagnostics;
};
