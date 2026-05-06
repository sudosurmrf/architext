/**
 * @module @architext/files-engine/apply-when
 * Concepts: [[ApplyWhen]], [[FileRuleFilter]], [[Conjunction]]
 * Spec: §7.1 FileRule.when semantics — serviceKind allowlist, requires (all present), excludes (none present)
 * Depends on: [[@architext/catalog]] (FileRule), [[@architext/schema]] (ServiceKind)
 * Consumed by: [[compute]]
 */

import type { FileRule } from "@architext/catalog";
import type { ServiceKind } from "@architext/schema";

export function applyWhen(
  rule: FileRule,
  serviceKind: ServiceKind,
  presentIds: ReadonlySet<string>
): boolean {
  if (rule.when === undefined) return true;
  const w = rule.when;

  if (w.serviceKind !== undefined && !w.serviceKind.includes(serviceKind)) {
    return false;
  }
  if (w.requires !== undefined && !w.requires.every((id) => presentIds.has(id))) {
    return false;
  }
  if (w.excludes !== undefined && w.excludes.some((id) => presentIds.has(id))) {
    return false;
  }
  return true;
}
