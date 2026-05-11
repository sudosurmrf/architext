import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "./types";
import { edgeEndpointsExist } from "./rules/edge-endpoints-exist";
import { noDuplicateIds } from "./rules/no-duplicate-ids";
import { groupReferencesExist } from "./rules/group-references-exist";
import { manifestCompletenessRule } from "./rules/manifest-completeness";
import { unreachableNodes } from "./rules/unreachable-nodes";
import { deadEndServices } from "./rules/dead-end-services";
import { cycleDetection } from "./rules/cycle-detection";
import { decisionBranchCompleteness } from "./rules/decision-branch-completeness";
import { disconnectedSubgraphs } from "./rules/disconnected-subgraphs";

export { edgeEndpointsExist } from "./rules/edge-endpoints-exist";
export { noDuplicateIds } from "./rules/no-duplicate-ids";
export { groupReferencesExist } from "./rules/group-references-exist";
export { manifestCompletenessRule } from "./rules/manifest-completeness";
export { unreachableNodes } from "./rules/unreachable-nodes";
export { deadEndServices } from "./rules/dead-end-services";
export { cycleDetection } from "./rules/cycle-detection";
export { decisionBranchCompleteness } from "./rules/decision-branch-completeness";
export { disconnectedSubgraphs } from "./rules/disconnected-subgraphs";

export type ConstraintRule = (spec: ArchitextSpec) => ConstraintDiagnostic[];

export const BUILT_IN_RULES: ConstraintRule[] = [
  noDuplicateIds,
  edgeEndpointsExist,
  groupReferencesExist,
  manifestCompletenessRule,
  unreachableNodes,
  deadEndServices,
  cycleDetection,
  decisionBranchCompleteness,
  disconnectedSubgraphs,
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
