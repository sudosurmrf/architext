/**
 * @module @architext/constraints/validate
 * Concepts: [[ConstraintDiagnostics]], [[CompletenessScore]]
 * Depends on: [[types]]
 * Consumed by: [[@architext/cli]], [[@architext/web]]
 */

import type { ArchitextWorkflowManifest, ConstraintDiagnostic } from "./types";

export function validateWorkflowManifest(
  manifest: ArchitextWorkflowManifest
): ConstraintDiagnostic[] {
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const contract of manifest.contracts) {
    if (!contract.schema) {
      diagnostics.push({
        severity: "warning",
        code: "contract.missing_schema",
        message: `Contract "${contract.name}" has no schema.`,
        path: `contracts.${contract.id}`,
      });
    }
    if (contract.schema && !hasBusinessMeaning(contract.businessContext)) {
      diagnostics.push({
        severity: "info",
        code: "contract.missing_business_meaning",
        message: `Contract "${contract.name}" has a schema but no business meaning.`,
        path: `contracts.${contract.id}.businessContext`,
      });
    }
  }

  for (const decision of manifest.decisions) {
    if (decision.branchLabel === "branch") {
      diagnostics.push({
        severity: "warning",
        code: "decision.unnamed_branch",
        message: `Decision ${decision.id} should have a branch label.`,
        path: `decisions.${decision.id}.branchLabel`,
      });
    }
    if (!decision.fallback) {
      diagnostics.push({
        severity: "info",
        code: "decision.no_fallback",
        message: `Decision ${decision.id} has no fallback branch marked.`,
        path: `decisions.${decision.id}.fallback`,
      });
    }
    if (!hasItems(decision.businessContext?.businessRules) && !hasItems(decision.businessContext?.acceptanceCriteria)) {
      diagnostics.push({
        severity: "warning",
        code: "decision.missing_business_logic",
        message: `Decision ${decision.id} has no business rules or acceptance criteria.`,
        path: `decisions.${decision.id}.businessContext`,
      });
    }
  }

  for (const gate of manifest.humanGates) {
    if (!gate.instructions) {
      diagnostics.push({
        severity: "warning",
        code: "human_gate.missing_instructions",
        message: `Human gate ${gate.id} has no review instructions.`,
        path: `humanGates.${gate.id}.instructions`,
      });
    }
    if (!hasItems(gate.businessContext?.acceptanceCriteria)) {
      diagnostics.push({
        severity: "warning",
        code: "human_gate.missing_approval_criteria",
        message: `Human gate ${gate.id} has no approval criteria.`,
        path: `humanGates.${gate.id}.businessContext.acceptanceCriteria`,
      });
    }
  }

  const nodesByService = new Map(manifest.nodes.map((node) => [node.id, node]));
  for (const agent of manifest.agents) {
    if (agent.modelIds.length === 0) {
      diagnostics.push({
        severity: "warning",
        code: "agent.no_model",
        message: `Agent ${agent.id} is not connected to an AI model.`,
        path: `agents.${agent.id}.modelIds`,
      });
    }
    const node = nodesByService.get(agent.serviceId);
    if (!node?.businessContext?.purpose) {
      diagnostics.push({
        severity: "warning",
        code: "agent.missing_purpose",
        message: `Agent ${agent.id} has no business purpose.`,
        path: `nodes.${agent.serviceId}.businessContext.purpose`,
      });
    }
  }

  return diagnostics.sort((a, b) => `${a.severity}:${a.code}:${a.path ?? ""}`.localeCompare(`${b.severity}:${b.code}:${b.path ?? ""}`));
}

function hasItems(value: readonly string[] | undefined): boolean {
  return value !== undefined && value.length > 0;
}

function hasBusinessMeaning(context: ArchitextWorkflowManifest["contracts"][number]["businessContext"]): boolean {
  return Boolean(
    context?.purpose ||
      context?.notes ||
      hasItems(context?.businessRules) ||
      hasItems(context?.inputs) ||
      hasItems(context?.outputs) ||
      hasItems(context?.acceptanceCriteria)
  );
}

export function constraintCompletenessScore(diagnostics: readonly ConstraintDiagnostic[]): number {
  const penalty = diagnostics.reduce((sum, diagnostic) => {
    if (diagnostic.severity === "error") return sum + 30;
    if (diagnostic.severity === "warning") return sum + 12;
    return sum + 4;
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}
