/**
 * @module @architext/files-engine/types
 * Concepts: [[FileTree]]
 * Spec: §7.3 File-tree rules engine — output type
 * Depends on: none (pure types)
 * Consumed by: [[compute]], [[index]] (re-export)
 */

export interface FileTree {
  readonly paths: readonly string[];
  readonly byService: Readonly<Record<string, readonly string[]>>;
}
