/**
 * @module @architext/catalog/catalog
 * Concepts: [[Catalog]], [[LookupTable]], [[Immutable]]
 * Spec: §7.1 Catalog entry schema — usage shape consumed by web palette and files-engine
 * Depends on: [[@architext/schema]] (ComponentCategory, ServiceKind), [[types]] (CatalogEntry)
 * Consumed by: [[load]] (returns this), [[@architext/web]] (palette filtering), [[@architext/files-engine]] (lookup file rules)
 */

import type { ComponentCategory, ServiceKind } from "@architext/schema";
import type { CatalogEntry } from "./types";

export interface Catalog {
  readonly entries: readonly CatalogEntry[];
  byId(id: string): CatalogEntry | undefined;
  byCategory(category: ComponentCategory): readonly CatalogEntry[];
  byCompatibleServiceKind(kind: ServiceKind): readonly CatalogEntry[];
  byKindIfService(kind: ServiceKind): readonly CatalogEntry[];
}

export function makeCatalog(entries: readonly CatalogEntry[]): Catalog {
  const byIdMap = new Map<string, CatalogEntry>();
  for (const e of entries) {
    if (byIdMap.has(e.id)) {
      throw new Error(`duplicate catalog id: ${e.id}`);
    }
    byIdMap.set(e.id, e);
  }

  const frozen = Object.freeze([...entries]) as readonly CatalogEntry[];

  const catalog: Catalog = {
    entries: frozen,
    byId: (id) => byIdMap.get(id),
    byCategory: (category) => frozen.filter((e) => e.category === category),
    byCompatibleServiceKind: (kind) =>
      frozen.filter(
        (e) => e.dropsAs === "component" && e.compatibleServiceKinds.includes(kind)
      ),
    byKindIfService: (kind) =>
      frozen.filter((e) => e.dropsAs === "service" && e.serviceKindIfService === kind),
  };
  return Object.freeze(catalog);
}
