/**
 * @module @architext/web/canvas/Canvas
 * Concepts: [[ReactFlowWrapper]], [[CanvasComponent]], [[StoreWiring]]
 * Spec: §4.1 Layout (React Flow canvas with groups and services); §4.7 Selection and keyboard shortcuts
 * Depends on: [[spec-store]], [[ui-store]], [[node-types]], [[edge-types]], [[EdgeCreation]], [[to-react-flow]], [[from-react-flow]]
 * Consumed by: [[App]] (main canvas area)
 */

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type NodeChange,
  type EdgeChange,
  type NodePositionChange,
  type NodeDimensionChange,
  type NodeRemoveChange,
  type EdgeRemoveChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useSpecStore } from "../store/spec-store";
import { useUIStore } from "../store/ui-store";
import { nodeTypes } from "./nodes/node-types";
import { edgeTypes } from "./edges/edge-types";
import { useEdgeCreation, EdgeCreationModal } from "./EdgeCreation";

/**
 * Main canvas component wrapping React Flow.
 * Reads spec data from the store, converts to RF nodes/edges,
 * and dispatches position/dimension/removal changes back to the store.
 */
export function Canvas() {
  // ─── Store selectors ─────────────────────────────────────
  const rfGraph = useSpecStore((s) => s.rfGraph);
  const applyPositionChanges = useSpecStore((s) => s.applyPositionChanges);
  const applyDimensionChanges = useSpecStore((s) => s.applyDimensionChanges);
  const applyNodeRemovals = useSpecStore((s) => s.applyNodeRemovals);
  const applyEdgeRemovals = useSpecStore((s) => s.applyEdgeRemovals);

  // ─── Edge creation ──────────────────────────────────────
  const {
    pendingConnection,
    error: edgeError,
    onConnect,
    onCancel: onEdgeCancel,
    onSelectProtocol,
    isDuplicate,
  } = useEdgeCreation();

  const selectedIds = useUIStore((s) => s.selectedIds);
  const select = useUIStore((s) => s.select);
  const addToSelection = useUIStore((s) => s.addToSelection);
  const clearSelection = useUIStore((s) => s.clearSelection);

  // ─── Apply selection state to nodes/edges ────────────────
  const nodesWithSelection = useMemo(
    () =>
      rfGraph.nodes.map((node) => ({
        ...node,
        selected: selectedIds.has(node.id),
      })),
    [rfGraph.nodes, selectedIds],
  );

  const edgesWithSelection = useMemo(
    () =>
      rfGraph.edges.map((edge) => ({
        ...edge,
        selected: selectedIds.has(edge.id),
      })),
    [rfGraph.edges, selectedIds],
  );

  // ─── Callbacks ───────────────────────────────────────────
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Position changes (drag end)
      const positionChanges = changes.filter(
        (c): c is NodePositionChange => c.type === "position" && c.dragging === false && c.position != null,
      );
      if (positionChanges.length > 0) {
        applyPositionChanges(
          positionChanges.map((c) => ({
            id: c.id,
            position: c.position!,
          })),
        );
      }

      // Dimension changes (resize end)
      const dimensionChanges = changes.filter(
        (c): c is NodeDimensionChange =>
          c.type === "dimensions" && c.dimensions != null && c.resizing === false,
      );
      if (dimensionChanges.length > 0) {
        applyDimensionChanges(
          dimensionChanges.map((c) => ({
            id: c.id,
            dimensions: {
              width: c.dimensions!.width,
              height: c.dimensions!.height,
            },
          })),
        );
      }

      // Removals
      const removeChanges = changes.filter(
        (c): c is NodeRemoveChange => c.type === "remove",
      );
      if (removeChanges.length > 0) {
        applyNodeRemovals(removeChanges.map((c) => c.id));
      }
    },
    [applyPositionChanges, applyDimensionChanges, applyNodeRemovals],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removeChanges = changes.filter(
        (c): c is EdgeRemoveChange => c.type === "remove",
      );
      if (removeChanges.length > 0) {
        applyEdgeRemovals(removeChanges.map((c) => c.id));
      }
    },
    [applyEdgeRemovals],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      if (_event.shiftKey) {
        addToSelection(node.id);
      } else {
        select(node.id);
      }
    },
    [select, addToSelection],
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // ─── Render ──────────────────────────────────────────────
  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={nodesWithSelection}
          edges={edgesWithSelection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
        <EdgeCreationModal
          pendingConnection={pendingConnection}
          error={edgeError}
          onCancel={onEdgeCancel}
          onSelectProtocol={onSelectProtocol}
          isDuplicate={isDuplicate}
        />
      </div>
    </ReactFlowProvider>
  );
}
