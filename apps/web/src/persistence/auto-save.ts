/**
 * @module @architext/web/persistence/auto-save
 * Concepts: [[AutoSave]], [[Debounce]], [[StoreSubscription]]
 * Spec: §2 (IndexedDB persistence); §4.7 (IndexedDB persists every undo entry so reload preserves the stack)
 * Depends on: [[spec-store]] (subscribe to spec changes), [[idb]] (saveSpec, saveHistory), [[history]] (HistorySnapshot)
 * Consumed by: [[App]] (initializes on mount)
 */

import { useSpecStore } from "../store/spec-store";
import { saveSpec, saveHistory } from "./idb";
import type { HistorySnapshot } from "../store/history";

const DEBOUNCE_MS = 500;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Subscribe to spec store changes and auto-save to IndexedDB.
 * Call once on app initialization. Returns an unsubscribe function.
 *
 * @param getHistory - callback to get the current HistorySnapshot for persistence
 */
export function startAutoSave(getHistory?: () => HistorySnapshot): () => void {
  const unsubscribe = useSpecStore.subscribe((state) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      await saveSpec(state.spec);
      if (getHistory) {
        await saveHistory(getHistory());
      }
    }, DEBOUNCE_MS);
  });

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    unsubscribe();
  };
}
