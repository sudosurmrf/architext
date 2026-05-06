/**
 * @module @architext/web/persistence/idb
 * Concepts: [[IndexedDB]], [[Persistence]], [[LoadSave]]
 * Spec: §2 System Architecture (IndexedDB persistence); §4.7 (persist undo stack so reload preserves it)
 * Depends on: idb-keyval, [[@architext/schema]] (ArchitextSpec), [[history]] (HistorySnapshot)
 * Consumed by: [[auto-save]] (writes), [[spec-store]] (initial load)
 */

import { get, set, del } from "idb-keyval";
import type { ArchitextSpec } from "@architext/schema";
import type { HistorySnapshot } from "../store/history";

const SPEC_KEY = "architext:spec";
const HISTORY_KEY = "architext:history";

/** Load the most recent spec from IndexedDB. Returns undefined if none saved. */
export async function loadSpec(): Promise<ArchitextSpec | undefined> {
  return get<ArchitextSpec>(SPEC_KEY);
}

/** Save a spec to IndexedDB. */
export async function saveSpec(spec: ArchitextSpec): Promise<void> {
  await set(SPEC_KEY, spec);
}

/** Load the history snapshot from IndexedDB. */
export async function loadHistory(): Promise<HistorySnapshot | undefined> {
  return get<HistorySnapshot>(HISTORY_KEY);
}

/** Save the history snapshot to IndexedDB. */
export async function saveHistory(snapshot: HistorySnapshot): Promise<void> {
  await set(HISTORY_KEY, snapshot);
}

/** Clear all Architext data from IndexedDB. */
export async function clearAll(): Promise<void> {
  await del(SPEC_KEY);
  await del(HISTORY_KEY);
}
