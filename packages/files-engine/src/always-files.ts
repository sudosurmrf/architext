/**
 * @module @architext/files-engine/always-files
 * Concepts: [[AlwaysFiles]], [[ProjectRoot]]
 * Spec: §7.3 File-tree rules engine — "Always emit: architext-spec.json (round-trip artifact), README.md, .gitignore"
 * Depends on: none
 * Consumed by: [[compute]]
 */

const ALWAYS = [".gitignore", "README.md", "architext-spec.json", "architext-workflow.json"] as const;

export function alwaysFiles(): readonly string[] {
  return ALWAYS;
}
