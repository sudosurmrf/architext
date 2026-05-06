/**
 * @module @architext/web/palette/palette-items
 * Concepts: [[PaletteItem]], [[CatalogMapping]], [[CategoryGrouping]]
 * Spec: §4.2 Palette — two-stage browser (rail + expanded panel); §7.1 CatalogEntry
 * Depends on: [[@architext/catalog]] (Catalog, CatalogEntry), [[@architext/patterns]] (Pattern), [[drag]] (DragItem), [[ui-store]] (PaletteCategory)
 * Consumed by: [[PaletteRail]] (category list), [[PalettePanel]] (items per category)
 */

import type { Catalog, CatalogEntry } from "@architext/catalog";
import type { Pattern } from "@architext/patterns";
import type { DragItem } from "../types/drag";
import type { PaletteCategory } from "../store/ui-store";
import type { GroupKind, ServiceKind } from "@architext/schema";

export interface PaletteItem {
  id: string;
  name: string;
  description: string;
  dragItem: DragItem;
  iconUrl?: string;
}

export interface PaletteCategoryDef {
  id: PaletteCategory;
  label: string;
  /** Lucide icon name */
  icon: string;
}

const CATEGORIES: PaletteCategoryDef[] = [
  { id: "architecture", label: "Architecture", icon: "LayoutGrid" },
  { id: "languages", label: "Languages", icon: "Code" },
  { id: "frameworks", label: "Frameworks", icon: "Boxes" },
  { id: "libraries", label: "Libraries", icon: "BookOpen" },
  { id: "build-tools", label: "Build Tools", icon: "Wrench" },
  { id: "datastores", label: "Datastores", icon: "HardDrive" },
  { id: "auth", label: "Auth", icon: "Shield" },
  { id: "entry-points", label: "Entry Points", icon: "Play" },
];

/** Returns the ordered list of palette categories with labels and icons */
export function getPaletteCategories(): PaletteCategoryDef[] {
  return CATEGORIES;
}

/** All group kinds as architecture palette items */
const GROUP_KINDS: { kind: GroupKind; name: string; description: string }[] = [
  { kind: "frontend", name: "Frontend Group", description: "Container for frontend services" },
  { kind: "backend", name: "Backend Group", description: "Container for backend services" },
  { kind: "data", name: "Data Group", description: "Container for data stores" },
  { kind: "workers", name: "Workers Group", description: "Container for background workers" },
  { kind: "external", name: "External Group", description: "Container for external APIs" },
  { kind: "sidecars", name: "Sidecars Group", description: "Container for sidecar services" },
  { kind: "custom", name: "Custom Group", description: "Custom logical group" },
];

/** All service kinds as architecture palette items */
const SERVICE_KINDS: { kind: ServiceKind; name: string; description: string }[] = [
  { kind: "frontend-app", name: "Frontend App", description: "Client-facing web application" },
  { kind: "backend-service", name: "Backend Service", description: "Server-side API or business logic" },
  { kind: "worker", name: "Worker", description: "Background job processor" },
  { kind: "database", name: "Database", description: "Persistent data store" },
  { kind: "cache", name: "Cache", description: "In-memory key-value cache" },
  { kind: "queue", name: "Queue", description: "Message queue / broker" },
  { kind: "sidecar", name: "Sidecar", description: "Co-deployed utility process" },
  { kind: "external-api", name: "External API", description: "Third-party API integration" },
];

/**
 * Converts a CatalogEntry into a DragItem.
 * Entries with `dropsAs: "service"` become ServiceTokens;
 * entries with `dropsAs: "component"` become ComponentChips.
 */
export function catalogEntryToDragItem(entry: CatalogEntry): DragItem {
  if (entry.dropsAs === "service") {
    return {
      type: "service-token",
      serviceKind: entry.serviceKindIfService,
      name: entry.name,
      catalogId: entry.id,
    };
  }
  return {
    type: "component-chip",
    catalogId: entry.id,
    category: entry.category,
    name: entry.name,
  };
}

/** Maps a PaletteCategory + ComponentCategory for catalog filtering */
const CATEGORY_TO_COMPONENT_CATEGORY: Partial<
  Record<PaletteCategory, string>
> = {
  languages: "language",
  frameworks: "framework",
  libraries: "library",
  "build-tools": "build-tool",
  datastores: "datastore",
  auth: "auth",
  "entry-points": "entry-point",
};

/** Returns palette items for a given category, built from catalog + patterns */
export function getItemsForCategory(
  category: PaletteCategory,
  catalog: Catalog,
  patterns: readonly Pattern[],
): PaletteItem[] {
  if (category === "architecture") {
    return getArchitectureItems(patterns);
  }

  const componentCategory = CATEGORY_TO_COMPONENT_CATEGORY[category];
  if (!componentCategory) return [];

  const entries = catalog.byCategory(
    componentCategory as Parameters<typeof catalog.byCategory>[0],
  );
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    description: entry.description,
    dragItem: catalogEntryToDragItem(entry),
    iconUrl: entry.iconUrl,
  }));
}

function getArchitectureItems(patterns: readonly Pattern[]): PaletteItem[] {
  const items: PaletteItem[] = [];

  // Group tokens
  for (const g of GROUP_KINDS) {
    items.push({
      id: `group-${g.kind}`,
      name: g.name,
      description: g.description,
      dragItem: { type: "group-token", groupKind: g.kind, name: g.name },
    });
  }

  // Service tokens
  for (const s of SERVICE_KINDS) {
    items.push({
      id: `service-${s.kind}`,
      name: s.name,
      description: s.description,
      dragItem: { type: "service-token", serviceKind: s.kind, name: s.name },
    });
  }

  // Patterns
  for (const p of patterns) {
    items.push({
      id: `pattern-${p.id}`,
      name: p.name,
      description: p.description,
      dragItem: { type: "pattern", patternId: p.id, name: p.name },
      iconUrl: p.iconUrl,
    });
  }

  return items;
}
