/**
 * @module @architext/web/lib/from-react-flow
 * Concepts: [[RFToSpec]], [[PositionSync]], [[PureFunction]]
 * Spec: §4.7 Undo/redo (position changes produce new spec snapshots)
 * Depends on: [[@architext/schema]] (ArchitextSpec, Position, Size)
 * Consumed by: [[Canvas]] (onNodesChange, onEdgesChange handlers), [[spec-store]] (dispatches these)
 */

import type { ArchitextSpec, Position, Size } from "@architext/schema";

export interface PositionChange {
  id: string;
  position: Position;
}

export interface DimensionChange {
  id: string;
  dimensions: Size;
}

/**
 * Applies position changes from React Flow's onNodesChange callback to the spec.
 * Handles both groups and services.
 */
export function applyNodePositionChanges(
  spec: ArchitextSpec,
  changes: readonly PositionChange[],
): ArchitextSpec {
  if (changes.length === 0) return spec;

  const posMap = new Map(changes.map((c) => [c.id, c.position]));
  let changed = false;

  const groups = spec.groups.map((g) => {
    const newPos = posMap.get(g.id);
    if (newPos) {
      changed = true;
      return { ...g, position: newPos };
    }
    return g;
  });

  const services = spec.services.map((s) => {
    const newPos = posMap.get(s.id);
    if (newPos) {
      changed = true;
      return { ...s, position: newPos };
    }
    return s;
  });

  if (!changed) return spec;
  return { ...spec, groups, services };
}

/**
 * Applies dimension (resize) changes to groups in the spec.
 */
export function applyNodeDimensionChanges(
  spec: ArchitextSpec,
  changes: readonly DimensionChange[],
): ArchitextSpec {
  if (changes.length === 0) return spec;

  const dimMap = new Map(changes.map((c) => [c.id, c.dimensions]));

  const groups = spec.groups.map((g) => {
    const newDim = dimMap.get(g.id);
    if (newDim) return { ...g, size: newDim };
    return g;
  });

  return { ...spec, groups };
}

/**
 * Removes nodes from the spec. Services removal also removes associated edges
 * and unlinks from groups.
 */
export function applyNodeRemovals(
  spec: ArchitextSpec,
  nodeIds: readonly string[],
): ArchitextSpec {
  if (nodeIds.length === 0) return spec;

  const removeSet = new Set(nodeIds);
  let result = spec;

  for (const id of removeSet) {
    const isGroup = result.groups.some((g) => g.id === id);
    const isService = result.services.some((s) => s.id === id);

    if (isGroup) {
      const group = result.groups.find((g) => g.id === id)!;
      const services = result.services.map((s) =>
        s.groupId === group.id ? { ...s, groupId: undefined } : s
      );
      const groups = result.groups
        .filter((g) => g.id !== id)
        .map((g) => g.parentGroupId === group.id ? { ...g, parentGroupId: undefined } : g);
      result = { ...result, groups, services };
    } else if (isService) {
      const services = result.services.filter((s) => s.id !== id);
      const edges = result.edges.filter((e) => e.from !== id && e.to !== id);
      const groups = result.groups.map((g) =>
        g.serviceIds.includes(id)
          ? { ...g, serviceIds: g.serviceIds.filter((sid) => sid !== id) }
          : g
      );
      result = { ...result, groups, services, edges };
    }
  }

  return result;
}

/**
 * Removes edges from the spec by id.
 */
export function applyEdgeRemovals(
  spec: ArchitextSpec,
  edgeIds: readonly string[],
): ArchitextSpec {
  if (edgeIds.length === 0) return spec;
  const removeSet = new Set(edgeIds);
  return { ...spec, edges: spec.edges.filter((e) => !removeSet.has(e.id)) };
}
