/**
 * @module @architext/web/palette/PalettePanel
 * Concepts: [[PalettePanel]], [[DragSource]], [[SearchFilter]], [[ExpandedPanel]]
 * Spec: §4.2 Palette — expanded panel shows items for active category, each item draggable
 * Depends on: [[ui-store]] (paletteOpen, paletteCategory, closePalette), [[palette-items]] (getItemsForCategory, PaletteItem), [[@architext/catalog]] (loadCatalog), [[@architext/patterns]] (loadPatterns)
 * Consumed by: [[App]] (adjacent to PaletteRail)
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { loadCatalog } from "@architext/catalog";
import { loadPatterns } from "@architext/patterns";
import { useUIStore } from "../store/ui-store";
import { getItemsForCategory, type PaletteItem } from "./palette-items";

const catalog = loadCatalog();
const patternLib = loadPatterns();

export function PalettePanel() {
  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const paletteCategory = useUIStore((s) => s.paletteCategory);
  const closePalette = useUIStore((s) => s.closePalette);
  const [search, setSearch] = useState("");

  // Reset search when category changes
  useEffect(() => {
    setSearch("");
  }, [paletteCategory]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && paletteOpen) {
        closePalette();
      }
    },
    [paletteOpen, closePalette],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const items = useMemo(() => {
    if (!paletteCategory) return [];
    return getItemsForCategory(paletteCategory, catalog, patternLib.entries);
  }, [paletteCategory]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [items, search]);

  if (!paletteOpen || !paletteCategory) return null;

  return (
    <div className="absolute left-14 top-0 z-30 flex h-full w-80 flex-col border-r border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <span className="text-sm font-semibold text-gray-700 capitalize">
          {paletteCategory.replace("-", " ")}
        </span>
        <button
          onClick={closePalette}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          title="Close"
        >
          &times;
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
        />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">No items found</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((item) => (
              <PaletteCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PaletteCard({ item }: { item: PaletteItem }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/architext",
      JSON.stringify(item.dragItem),
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  // Show compatibility indicator for component chips
  const compatLabel =
    item.dragItem.type === "component-chip"
      ? `${item.dragItem.category}`
      : item.dragItem.type === "group-token"
        ? "group"
        : item.dragItem.type === "service-token"
          ? "service"
          : "pattern";

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab rounded-md border border-gray-100 bg-gray-50 px-3 py-2 transition-colors hover:border-blue-200 hover:bg-blue-50 active:cursor-grabbing"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{item.name}</span>
        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500">
          {compatLabel}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
        {item.description}
      </p>
      {(item.tags?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags?.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-500">
              {tag}
            </span>
          ))}
          {(item.integrationPatterns?.length ?? 0) > 0 && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600">
              {item.integrationPatterns!.length} patterns
            </span>
          )}
        </div>
      )}
    </div>
  );
}
