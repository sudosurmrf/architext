/**
 * @module @architext/patterns/load
 * Concepts: [[PatternLibrary]], [[Loader]]
 * Spec: §7.4 Patterns library — single entry point
 * Depends on: [[data/index]] (allPatterns)
 * Consumed by: [[index]] (re-export), [[@architext/web]] (palette Architecture category)
 */

import type { Pattern } from "./types";
import { allPatterns } from "./data";

export interface PatternLibrary {
  readonly entries: readonly Pattern[];
  byId(id: string): Pattern | undefined;
}

let cached: PatternLibrary | undefined;

export function loadPatterns(): PatternLibrary {
  if (cached === undefined) {
    const byIdMap = new Map<string, Pattern>();
    for (const p of allPatterns) {
      if (byIdMap.has(p.id)) {
        throw new Error(`duplicate pattern id: ${p.id}`);
      }
      byIdMap.set(p.id, p);
    }
    cached = Object.freeze({
      entries: allPatterns,
      byId: (id: string) => byIdMap.get(id),
    });
  }
  return cached;
}
