/**
 * @module @architext/web/store/history
 * Concepts: [[UndoRedo]], [[ImmutableSnapshot]], [[Coalesce]], [[BoundedStack]]
 * Spec: §4.7 Undo/redo — immutable spec history, 100 cap, 300ms coalesce, IndexedDB persistence
 * Depends on: [[@architext/schema]] (ArchitextSpec)
 * Consumed by: [[spec-store]] (integrates history into mutation flow), [[auto-save]] (persists snapshots)
 */

import type { ArchitextSpec } from "@architext/schema";

const MAX_ENTRIES = 100;
const COALESCE_MS = 300;

export interface HistorySnapshot {
  entries: ArchitextSpec[];
  cursor: number;
}

export class SpecHistory {
  private entries: ArchitextSpec[];
  private cursor: number;
  private lastPushTime: number;

  constructor(initial: ArchitextSpec) {
    this.entries = [initial];
    this.cursor = 0;
    this.lastPushTime = 0;
  }

  static fromSnapshot(snap: HistorySnapshot): SpecHistory {
    const h = new SpecHistory(snap.entries[0]!);
    h.entries = [...snap.entries];
    h.cursor = snap.cursor;
    h.lastPushTime = 0;
    return h;
  }

  current(): ArchitextSpec {
    return this.entries[this.cursor]!;
  }

  canUndo(): boolean {
    return this.cursor > 0;
  }

  canRedo(): boolean {
    return this.cursor < this.entries.length - 1;
  }

  push(spec: ArchitextSpec): void {
    const now = Date.now();
    const elapsed = now - this.lastPushTime;

    if (elapsed <= COALESCE_MS && this.cursor > 0) {
      // Coalesce: replace current entry instead of adding new one
      this.entries[this.cursor] = spec;
    } else {
      // Trim any redo entries
      this.entries = this.entries.slice(0, this.cursor + 1);
      this.entries.push(spec);
      this.cursor = this.entries.length - 1;

      // Cap at MAX_ENTRIES
      if (this.entries.length > MAX_ENTRIES) {
        const excess = this.entries.length - MAX_ENTRIES;
        this.entries = this.entries.slice(excess);
        this.cursor -= excess;
      }
    }

    this.lastPushTime = now;
  }

  undo(): ArchitextSpec | undefined {
    if (!this.canUndo()) return undefined;
    this.cursor--;
    return this.entries[this.cursor]!;
  }

  redo(): ArchitextSpec | undefined {
    if (!this.canRedo()) return undefined;
    this.cursor++;
    return this.entries[this.cursor]!;
  }

  snapshot(): HistorySnapshot {
    return {
      entries: [...this.entries],
      cursor: this.cursor,
    };
  }
}
