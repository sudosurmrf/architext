/**
 * @module @architext/web/lib/export-spec
 * Concepts: [[ExportTransform]], [[StripLayoutData]], [[CompactIds]], [[LeanSpec]]
 * Spec: §5.7 Web → CLI handoff — exported spec should be lean (no layout, short ids)
 * Depends on: [[@architext/schema]] (ArchitextSpec)
 * Consumed by: [[ExportModal]], [[ApplyModal]]
 */

import type { ArchitextSpec, Edge } from "@architext/schema";

/**
 * Prepares the spec for export by:
 * 1. Stripping canvas layout data (position, size) — the AI agent only
 *    needs architecture, not visual coordinates.
 * 2. Replacing UUIDs with short semantic ids (e.g. "api" or "svc-1") to
 *    reduce token count when the spec is sent to an LLM.
 */
export function prepareForExport(spec: ArchitextSpec): ArchitextSpec {
  // Build a mapping from UUID → compact id.
  // Use the entity's name as the base (slug-ified), with a numeric suffix
  // if names collide.
  const idMap = new Map<string, string>();
  const usedIds = new Set<string>();

  function compactId(originalId: string, baseName: string): string {
    if (idMap.has(originalId)) return idMap.get(originalId)!;
    const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let candidate = slug || "node";
    let n = 1;
    while (usedIds.has(candidate)) {
      candidate = `${slug}-${++n}`;
    }
    usedIds.add(candidate);
    idMap.set(originalId, candidate);
    return candidate;
  }

  // Assign compact ids to groups first, then services.
  for (const g of spec.groups) compactId(g.id, g.name);
  for (const s of spec.services) compactId(s.id, s.name);

  // Edges get sequential ids.
  for (let i = 0; i < spec.edges.length; i++) {
    const e = spec.edges[i]!;
    if (!idMap.has(e.id)) {
      const label = `e${i + 1}`;
      usedIds.add(label);
      idMap.set(e.id, label);
    }
  }

  const remap = (id: string) => idMap.get(id) ?? id;

  return {
    schemaVersion: spec.schemaVersion,
    project: spec.project,
    groups: spec.groups.map(({ position, size, ...g }) => ({
      ...g,
      id: remap(g.id),
      serviceIds: g.serviceIds.map(remap),
    })),
    services: spec.services.map(({ position, ...s }) => ({
      ...s,
      id: remap(s.id),
      ...(s.groupId !== undefined ? { groupId: remap(s.groupId) } : {}),
    })),
    edges: spec.edges.map((e) => {
      const { id, from, to, ...rest } = e;
      return { ...rest, id: remap(id), from: remap(from), to: remap(to) } as Edge;
    }),
  };
}
