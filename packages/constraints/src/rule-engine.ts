import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "./types";
import { edgeEndpointsExist } from "./rules/edge-endpoints-exist";
import { noDuplicateIds } from "./rules/no-duplicate-ids";
import { groupReferencesExist } from "./rules/group-references-exist";
import { manifestCompletenessRule } from "./rules/manifest-completeness";
import { protocolKindCompatRule } from "./rules/protocol-kind-compat";
import { contractSchemaMatchRule } from "./rules/contract-schema-match";
import { missingContractsRule } from "./rules/missing-contracts";
import { portPathConsistencyRule } from "./rules/port-path-consistency";

export { edgeEndpointsExist } from "./rules/edge-endpoints-exist";
export { noDuplicateIds } from "./rules/no-duplicate-ids";
export { groupReferencesExist } from "./rules/group-references-exist";
export { manifestCompletenessRule } from "./rules/manifest-completeness";
export { protocolKindCompatRule } from "./rules/protocol-kind-compat";
export { contractSchemaMatchRule } from "./rules/contract-schema-match";
export { missingContractsRule } from "./rules/missing-contracts";
export { portPathConsistencyRule } from "./rules/port-path-consistency";

export type ConstraintRule = (spec: ArchitextSpec) => ConstraintDiagnostic[];

export const BUILT_IN_RULES: ConstraintRule[] = [
  noDuplicateIds,
  edgeEndpointsExist,
  groupReferencesExist,
  manifestCompletenessRule,
  protocolKindCompatRule,
  contractSchemaMatchRule,
  missingContractsRule,
  portPathConsistencyRule,
];

const SEVERITY_ORDER: Record<ConstraintDiagnostic["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function runConstraints(
  spec: ArchitextSpec,
  rules: ConstraintRule[] = BUILT_IN_RULES,
): ConstraintDiagnostic[] {
  const diagnostics = rules.flatMap((rule) => rule(spec));
  return diagnostics.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.code.localeCompare(b.code),
  );
}
