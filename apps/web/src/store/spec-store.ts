/**
 * @module @architext/web/store/spec-store
 * Concepts: [[SpecStore]], [[ZustandStore]], [[Actions]], [[Selectors]]
 * Spec: §4.3 Drop rules (dispatch mutations on valid drop); §4.7 Undo/redo (history integration)
 * Depends on: [[spec-mutations]], [[to-react-flow]], [[from-react-flow]], [[history]], [[@architext/schema]] (ArchitextSpec)
 * Consumed by: [[Canvas]], [[PalettePanel]], [[Inspector]], [[SidePanel]], [[TopBar]], [[auto-save]]
 */

import { create } from "zustand";
import type {
  ArchitextSpec,
  Edge,
  Component,
  Position,
  Size,
} from "@architext/schema";
import {
  addGroup,
  addService,
  addComponent,
  removeNode,
  addEdge,
  removeEdge,
  moveNode,
  resizeGroup,
  duplicateNode,
  reparentService,
  type AddGroupParams,
  type AddServiceParams,
} from "../lib/spec-mutations";
import { specToReactFlow, type RFGraph } from "../lib/to-react-flow";
import {
  applyNodePositionChanges,
  applyNodeDimensionChanges,
  applyNodeRemovals,
  applyEdgeRemovals,
  type PositionChange,
  type DimensionChange,
} from "../lib/from-react-flow";

function emptySpec(): ArchitextSpec {
  return {
    schemaVersion: "0.1.0",
    project: { name: "Untitled", slug: "untitled" },
    groups: [],
    services: [],
    edges: [],
  };
}

export interface SpecState {
  /** The current spec */
  spec: ArchitextSpec;

  /** Derived React Flow graph (recomputed on spec change) */
  rfGraph: RFGraph;

  // ─── Actions ───────────────────────────────────────────
  setSpec: (spec: ArchitextSpec) => void;
  updateProject: (name: string, slug: string, description?: string) => void;
  addGroup: (params: AddGroupParams) => void;
  addService: (params: AddServiceParams) => void;
  addComponent: (serviceId: string, component: Component) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  moveNode: (nodeId: string, position: Position) => void;
  resizeGroup: (groupId: string, size: Size) => void;
  duplicateNode: (nodeId: string, newId: string) => void;
  reparentService: (serviceId: string, newGroupId: string | undefined, newPosition: Position) => void;

  // ─── React Flow sync ──────────────────────────────────
  applyPositionChanges: (changes: PositionChange[]) => void;
  applyDimensionChanges: (changes: DimensionChange[]) => void;
  applyNodeRemovals: (nodeIds: string[]) => void;
  applyEdgeRemovals: (edgeIds: string[]) => void;
}

export const useSpecStore = create<SpecState>((set) => {
  const update = (fn: (spec: ArchitextSpec) => ArchitextSpec) =>
    set((state) => {
      const spec = fn(state.spec);
      return { spec, rfGraph: specToReactFlow(spec) };
    });

  const initial = emptySpec();

  return {
    spec: initial,
    rfGraph: specToReactFlow(initial),

    setSpec: (spec) => set({ spec, rfGraph: specToReactFlow(spec) }),
    updateProject: (name, slug, description) =>
      update((s) => ({
        ...s,
        project: { ...s.project, name, slug, ...(description !== undefined ? { description } : {}) },
      })),
    addGroup: (params) => update((s) => addGroup(s, params)),
    addService: (params) => update((s) => addService(s, params)),
    addComponent: (serviceId, component) => update((s) => addComponent(s, serviceId, component)),
    removeNode: (nodeId) => update((s) => removeNode(s, nodeId)),
    addEdge: (edge) => update((s) => addEdge(s, edge)),
    removeEdge: (edgeId) => update((s) => removeEdge(s, edgeId)),
    moveNode: (nodeId, position) => update((s) => moveNode(s, nodeId, position)),
    resizeGroup: (groupId, size) => update((s) => resizeGroup(s, groupId, size)),
    duplicateNode: (nodeId, newId) => update((s) => duplicateNode(s, nodeId, newId)),
    reparentService: (serviceId, newGroupId, newPosition) =>
      update((s) => reparentService(s, serviceId, newGroupId, newPosition)),

    applyPositionChanges: (changes) => update((s) => applyNodePositionChanges(s, changes)),
    applyDimensionChanges: (changes) => update((s) => applyNodeDimensionChanges(s, changes)),
    applyNodeRemovals: (nodeIds) => update((s) => applyNodeRemovals(s, nodeIds)),
    applyEdgeRemovals: (edgeIds) => update((s) => applyEdgeRemovals(s, edgeIds)),
  };
});
