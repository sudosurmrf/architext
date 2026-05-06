/**
 * @module @architext/catalog/load
 * Concepts: [[Catalog]], [[Loader]]
 * Spec: §7.1 Catalog entry schema — single entry point for consumers
 * Depends on: [[catalog]] (makeCatalog), [[data/index]] (allEntries)
 * Consumed by: [[index]] (re-export), [[@architext/web]] (palette init), [[@architext/files-engine]]
 */

import { makeCatalog, type Catalog } from "./catalog";
import { allEntries } from "./data";

let cached: Catalog | undefined;

export function loadCatalog(): Catalog {
  if (cached === undefined) {
    cached = makeCatalog(allEntries);
  }
  return cached;
}
