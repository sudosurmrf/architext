/**
 * @module @architext/constraints/format
 * Concepts: [[ManifestFormatting]], [[AgentReadableContract]]
 * Depends on: [[types]]
 * Consumed by: [[@architext/cli]], [[@architext/web]]
 */

import type { ArchitextWorkflowManifest } from "./types";

export function formatWorkflowManifest(manifest: ArchitextWorkflowManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function summarizeWorkflowManifest(manifest: ArchitextWorkflowManifest): string {
  return [
    `Workflow manifest: ${manifest.nodes.length} nodes, ${manifest.edges.length} edges`,
    `Agents: ${manifest.agents.length}`,
    `Models: ${manifest.models.length}`,
    `Human gates: ${manifest.humanGates.length}`,
    `Decisions: ${manifest.decisions.length}`,
    `Runtime: ${manifest.runtimeHints.runtime}`,
    `Expected files: ${manifest.expectedFiles.length}`,
  ].join("\n");
}
