/**
 * @module @architext/web/store/ui-store
 * Concepts: [[UIStore]], [[Selection]], [[PaletteState]], [[PanelTab]], [[KeyboardShortcuts]]
 * Spec: §4.2 Palette (rail click opens panel, ESC closes); §4.6 Side panel (three tabs); §4.7 Selection and keyboard shortcuts
 * Depends on: zustand
 * Consumed by: [[Canvas]] (selection), [[PaletteRail]] (open/close), [[PalettePanel]] (category), [[SidePanel]] (active tab), [[TopBar]] (keyboard handler)
 */

import { create } from "zustand";

export type PanelTab = "spec" | "files" | "code";

export type PaletteCategory =
  | "architecture"
  | "languages"
  | "frameworks"
  | "libraries"
  | "build-tools"
  | "datastores"
  | "infrastructure"
  | "aws"
  | "ai"
  | "workflow"
  | "auth"
  | "entry-points";

export interface UIState {
  // ─── Selection ────────────────────────────────────
  /** Set of selected node/edge ids */
  selectedIds: ReadonlySet<string>;
  select: (id: string) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;

  // ─── Palette ──────────────────────────────────────
  paletteOpen: boolean;
  paletteCategory: PaletteCategory | null;
  openPalette: (category: PaletteCategory) => void;
  closePalette: () => void;
  togglePalette: (category: PaletteCategory) => void;

  // ─── Side Panel ───────────────────────────────────
  panelTab: PanelTab;
  setPanelTab: (tab: PanelTab) => void;
  propertiesOpen: boolean;
  setPropertiesOpen: (open: boolean) => void;
  toggleProperties: () => void;

  // ─── Modals ───────────────────────────────────────
  exportModalOpen: boolean;
  setExportModalOpen: (open: boolean) => void;
  applyModalOpen: boolean;
  setApplyModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Selection
  selectedIds: new Set<string>(),
  select: (id) => set({ selectedIds: new Set([id]) }),
  addToSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  clearSelection: () => set({ selectedIds: new Set() }),

  // Palette
  paletteOpen: false,
  paletteCategory: null,
  openPalette: (category) => set({ paletteOpen: true, paletteCategory: category }),
  closePalette: () => set({ paletteOpen: false, paletteCategory: null }),
  togglePalette: (category) =>
    set((state) =>
      state.paletteOpen && state.paletteCategory === category
        ? { paletteOpen: false, paletteCategory: null }
        : { paletteOpen: true, paletteCategory: category }
    ),

  // Panel
  panelTab: "spec",
  setPanelTab: (tab) => set({ panelTab: tab }),
  propertiesOpen: false,
  setPropertiesOpen: (open) => set({ propertiesOpen: open }),
  toggleProperties: () => set((state) => ({ propertiesOpen: !state.propertiesOpen })),

  // Modals
  exportModalOpen: false,
  setExportModalOpen: (open) => set({ exportModalOpen: open }),
  applyModalOpen: false,
  setApplyModalOpen: (open) => set({ applyModalOpen: open }),
}));
