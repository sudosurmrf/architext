/**
 * @module @architext/web/App
 * Concepts: [[AppShell]], [[LayoutRegions]], [[KeyboardShortcuts]], [[HistoryIntegration]], [[AutoSave]]
 * Spec: §4.1 Layout — three regions (top bar, palette + canvas, side panel)
 * Depends on: [[TopBar]], [[PaletteRail]], [[PalettePanel]], [[Canvas]], [[SidePanel]], [[ExportModal]], [[ApplyModal]], [[spec-store]], [[ui-store]], [[history]], [[auto-save]], [[idb]]
 * Consumed by: [[main]] (root render)
 */

import { useEffect, useRef, useState, useCallback } from "react";

import { TopBar } from "./topbar/TopBar";
import { ExportModal } from "./topbar/ExportModal";
import { ApplyModal } from "./topbar/ApplyModal";
import { ShortcutOverlay } from "./topbar/ShortcutOverlay";
import { PaletteRail } from "./palette/PaletteRail";
import { PalettePanel } from "./palette/PalettePanel";
import { Canvas } from "./canvas/Canvas";
import { SidePanel } from "./panel/SidePanel";
import { PropertiesDrawer } from "./panel/PropertiesDrawer";

import { useSpecStore } from "./store/spec-store";
import { useUIStore } from "./store/ui-store";
import { SpecHistory } from "./store/history";
import { clearAll, loadSpec, loadHistory } from "./persistence/idb";
import { startAutoSave } from "./persistence/auto-save";
import { prepareForExport } from "./lib/export-spec";

export function App() {
  const historyRef = useRef<SpecHistory | null>(null);
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);

  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const exportModalOpen = useUIStore((s) => s.exportModalOpen);
  const setExportModalOpen = useUIStore((s) => s.setExportModalOpen);
  const applyModalOpen = useUIStore((s) => s.applyModalOpen);
  const setApplyModalOpen = useUIStore((s) => s.setApplyModalOpen);
  const closePalette = useUIStore((s) => s.closePalette);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const setPropertiesOpen = useUIStore((s) => s.setPropertiesOpen);

  // ─── Initialization: load from IndexedDB + start auto-save ────
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      const [savedSpec, savedHistory] = await Promise.all([
        loadSpec(),
        loadHistory(),
      ]);

      if (savedHistory && savedHistory.entries.length > 0) {
        historyRef.current = SpecHistory.fromSnapshot(savedHistory);
        useSpecStore.getState().setSpec(historyRef.current.current());
      } else if (savedSpec) {
        historyRef.current = new SpecHistory(savedSpec);
        useSpecStore.getState().setSpec(savedSpec);
      } else {
        historyRef.current = new SpecHistory(useSpecStore.getState().spec);
      }

      // Subscribe to spec changes and push to history
      const unsubSpec = useSpecStore.subscribe((state, prevState) => {
        if (state.spec !== prevState.spec && historyRef.current) {
          historyRef.current.push(state.spec);
        }
      });

      // Start auto-save with history snapshot access
      const stopAutoSave = startAutoSave(
        () => historyRef.current?.snapshot() ?? { entries: [], cursor: 0 },
      );

      cleanup = () => {
        unsubSpec();
        stopAutoSave();
      };
    })();

    return () => cleanup?.();
  }, []);

  // ─── Download handler (reused by Ctrl+S shortcut) ─────────────
  const handleExportDownload = useCallback(() => {
    const spec = useSpecStore.getState().spec;
    const json = JSON.stringify(prepareForExport(spec), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architext-spec.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleResetDesign = useCallback(async () => {
    const confirmed = window.confirm(
      "Reset this design and clear the saved local draft? This cannot be undone.",
    );
    if (!confirmed) return;

    await clearAll();
    const spec = useSpecStore.getState().resetSpec();
    historyRef.current = new SpecHistory(spec);
    closePalette();
    clearSelection();
    setPropertiesOpen(false);
    setExportModalOpen(false);
    setApplyModalOpen(false);
  }, [
    clearSelection,
    closePalette,
    setApplyModalOpen,
    setExportModalOpen,
    setPropertiesOpen,
  ]);

  // ─── Global keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd+S: export download (prevent browser save)
      if (mod && e.key === "s") {
        e.preventDefault();
        handleExportDownload();
        return;
      }

      // Ctrl/Cmd+Z: undo; Shift+Ctrl/Cmd+Z: redo
      if (mod && e.key === "z") {
        e.preventDefault();
        if (!historyRef.current) return;
        if (e.shiftKey) {
          const next = historyRef.current.redo();
          if (next) useSpecStore.getState().setSpec(next);
        } else {
          const prev = historyRef.current.undo();
          if (prev) useSpecStore.getState().setSpec(prev);
        }
        return;
      }

      // Ctrl/Cmd+D: duplicate selected node
      if (mod && e.key === "d") {
        e.preventDefault();
        const selectedIds = useUIStore.getState().selectedIds;
        const store = useSpecStore.getState();
        for (const id of selectedIds) {
          const newId = `${id}-copy-${Date.now()}`;
          store.duplicateNode(id, newId);
        }
        return;
      }

      // Delete / Backspace: remove selected nodes and edges
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't capture if typing in an input/textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        const selectedIds = useUIStore.getState().selectedIds;
        const store = useSpecStore.getState();
        for (const id of selectedIds) {
          // Try both: removeNode handles groups/services, removeEdge handles edges
          store.removeNode(id);
          store.removeEdge(id);
        }
        clearSelection();
        return;
      }

      // ? — show keyboard shortcut help (not in input fields)
      if (e.key === "?") {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        setShortcutOverlayOpen(true);
        return;
      }

      // Escape: close palette, deselect
      if (e.key === "Escape") {
        closePalette();
        clearSelection();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleExportDownload, closePalette, clearSelection]);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50 text-gray-900">
      <TopBar onResetDesign={handleResetDesign} />

      <div className="relative flex flex-1 overflow-hidden">
        <PaletteRail />
        {paletteOpen && <PalettePanel />}

        <div className="flex-1">
          <Canvas />
        </div>

        <SidePanel />
        <PropertiesDrawer />
      </div>

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
      <ApplyModal
        open={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
      />
      <ShortcutOverlay
        open={shortcutOverlayOpen}
        onClose={() => setShortcutOverlayOpen(false)}
      />
    </div>
  );
}
