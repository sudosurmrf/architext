import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpecHistory } from "../src/store/history";
import type { ArchitextSpec } from "@architext/schema";

function makeSpec(name: string): ArchitextSpec {
  return {
    schemaVersion: "0.1.0",
    project: { name, slug: name.toLowerCase() },
    groups: [],
    services: [],
    edges: [],
  };
}

describe("SpecHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with initial state", () => {
    const initial = makeSpec("A");
    const h = new SpecHistory(initial);
    expect(h.current()).toEqual(initial);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it("push + undo restores previous state", () => {
    const a = makeSpec("A");
    const b = makeSpec("B");
    const h = new SpecHistory(a);
    vi.advanceTimersByTime(500);
    h.push(b);
    expect(h.current()).toEqual(b);
    expect(h.canUndo()).toBe(true);
    expect(h.undo()).toEqual(a);
  });

  it("redo after undo restores forward state", () => {
    const a = makeSpec("A");
    const b = makeSpec("B");
    const h = new SpecHistory(a);
    vi.advanceTimersByTime(500);
    h.push(b);
    h.undo();
    expect(h.canRedo()).toBe(true);
    expect(h.redo()).toEqual(b);
  });

  it("push after undo clears redo stack", () => {
    const a = makeSpec("A");
    const b = makeSpec("B");
    const c = makeSpec("C");
    const h = new SpecHistory(a);
    vi.advanceTimersByTime(500);
    h.push(b);
    h.undo();
    vi.advanceTimersByTime(500);
    h.push(c);
    expect(h.canRedo()).toBe(false);
    expect(h.current()).toEqual(c);
  });

  it("coalesces rapid pushes within 300ms", () => {
    const a = makeSpec("A");
    const b = makeSpec("B");
    const c = makeSpec("C");
    const h = new SpecHistory(a);
    vi.advanceTimersByTime(500);
    h.push(b);
    vi.advanceTimersByTime(100); // within 300ms
    h.push(c);
    // Should have coalesced b and c into one entry
    expect(h.current()).toEqual(c);
    expect(h.undo()).toEqual(a); // jumps straight back to a
  });

  it("does not coalesce pushes after 300ms", () => {
    const a = makeSpec("A");
    const b = makeSpec("B");
    const c = makeSpec("C");
    const h = new SpecHistory(a);
    vi.advanceTimersByTime(500);
    h.push(b);
    vi.advanceTimersByTime(400); // beyond 300ms
    h.push(c);
    expect(h.undo()).toEqual(b);
    expect(h.undo()).toEqual(a);
  });

  it("caps history at 100 entries", () => {
    const h = new SpecHistory(makeSpec("0"));
    for (let i = 1; i <= 120; i++) {
      vi.advanceTimersByTime(500);
      h.push(makeSpec(String(i)));
    }
    // Should have capped — undo 100 times hits the floor
    let undoCount = 0;
    while (h.canUndo()) {
      h.undo();
      undoCount++;
    }
    expect(undoCount).toBeLessThanOrEqual(100);
  });

  it("undo returns undefined when nothing to undo", () => {
    const h = new SpecHistory(makeSpec("A"));
    expect(h.undo()).toBeUndefined();
  });

  it("redo returns undefined when nothing to redo", () => {
    const h = new SpecHistory(makeSpec("A"));
    expect(h.redo()).toBeUndefined();
  });

  it("snapshot returns a copy of the entire stack for persistence", () => {
    const a = makeSpec("A");
    const b = makeSpec("B");
    const h = new SpecHistory(a);
    vi.advanceTimersByTime(500);
    h.push(b);
    const snap = h.snapshot();
    expect(snap.entries).toHaveLength(2);
    expect(snap.cursor).toBe(1);
  });

  it("restores from a snapshot", () => {
    const a = makeSpec("A");
    const b = makeSpec("B");
    const h = new SpecHistory(a);
    vi.advanceTimersByTime(500);
    h.push(b);
    const snap = h.snapshot();

    const h2 = SpecHistory.fromSnapshot(snap);
    expect(h2.current()).toEqual(b);
    expect(h2.undo()).toEqual(a);
  });
});
