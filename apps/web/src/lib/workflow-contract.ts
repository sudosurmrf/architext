/**
 * @module @architext/web/lib/workflow-contract
 * Concepts: [[WorkflowContractPreview]], [[ConstraintCompleteness]]
 * Depends on: [[export-spec]], [[@architext/constraints]]
 * Consumed by: [[CodeTab]], [[ApplyModal]], [[ExportModal]]
 */

import type { ArchitextSpec } from "@architext/schema";
import {
  compileWorkflowManifest,
  constraintCompletenessScore,
  formatWorkflowManifest,
  summarizeWorkflowManifest,
  validateWorkflowManifest,
} from "@architext/constraints";
import { prepareForExport } from "./export-spec";

export function buildWorkflowContractPreview(spec: ArchitextSpec) {
  const exportedSpec = prepareForExport(spec);
  const manifest = compileWorkflowManifest(exportedSpec);
  const diagnostics = validateWorkflowManifest(manifest);
  return {
    exportedSpec,
    manifest,
    diagnostics,
    completenessScore: constraintCompletenessScore(diagnostics),
    summary: summarizeWorkflowManifest(manifest),
    json: formatWorkflowManifest(manifest),
  };
}
