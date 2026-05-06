/**
 * @module @architext/web/canvas/Canvas
 * Concepts: [[ReactFlowWrapper]], [[CanvasComponent]], [[StoreWiring]]
 * Spec: §4.1 Layout (React Flow canvas with groups and services); §4.7 Selection and keyboard shortcuts
 * Depends on: [[spec-store]], [[ui-store]], [[node-types]], [[edge-types]], [[EdgeCreation]], [[to-react-flow]], [[from-react-flow]]
 * Consumed by: [[App]] (main canvas area)
 */

import { useCallback, useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  type Node,
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
import { handleCanvasDrop } from "./drop-handler";

/**
 * Main canvas component wrapping React Flow.
 * Reads spec data from the store, converts to RF nodes/edges,
 * and dispatches position/dimension/removal changes back to the store.
 */
export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}

function CanvasInner() {
  // ─── Store selectors ─────────────────────────────────────
  const rfGraph = useSpecStore((s) => s.rfGraph);
  const spec = useSpecStore((s) => s.spec);
  const applyPositionChanges = useSpecStore((s) => s.applyPositionChanges);
  const applyDimensionChanges = useSpecStore((s) => s.applyDimensionChanges);
  const applyNodeRemovals = useSpecStore((s) => s.applyNodeRemovals);
  const applyEdgeRemovals = useSpecStore((s) => s.applyEdgeRemovals);
  const dispatchAddGroup = useSpecStore((s) => s.addGroup);
  const dispatchAddService = useSpecStore((s) => s.addService);
  const dispatchAddComponent = useSpecStore((s) => s.addComponent);
  const dispatchAddEdge = useSpecStore((s) => s.addEdge);
  const dispatchReparent = useSpecStore((s) => s.reparentService);

  // ─── React Flow instance ──────────────────────────────────
  const rfInstance = useReactFlow();

  // ─── Edge creation ──────────────────────────────────────
  const {
    pendingConnection,
    error: edgeError,
    onConnect,
    onCancel: onEdgeCancel,
    onSelectProtocol,
    isDuplicate,
  } = useEdgeCreation();

  const isEmpty = spec.services.length === 0 && spec.groups.length === 0;

  const selectedIds = useUIStore((s) => s.selectedIds);
  const select = useUIStore((s) => s.select);
  const addToSelection = useUIStore((s) => s.addToSelection);
  const clearSelection = useUIStore((s) => s.clearSelection);

  // ─── Local node state for smooth drag/resize ──────────────
  // React Flow needs to own node positions during drag and dimensions
  // during resize for smooth visual updates. We keep a local copy that
  // RF can mutate freely, and sync back to the spec store only on end.
  const [localNodes, setLocalNodes] = useState<Node[]>([]);

  // Re-sync local nodes from spec store whenever rfGraph changes
  // (new nodes added, nodes removed, etc.) — but NOT during drag/resize
  // since that would fight with RF's internal state.
  useEffect(() => {
    setLocalNodes(
      rfGraph.nodes.map((node) => ({
        ...node,
        selected: selectedIds.has(node.id),
      })),
    );
  }, [rfGraph.nodes, selectedIds]);

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
      // Apply ALL changes to local state immediately — this is what
      // makes drag/resize visually smooth. RF can see the updated
      // positions on the very next frame.
      setLocalNodes((prev) => applyNodeChanges(changes, prev));

      // On drag END, sync positions AND check if any service landed
      // inside (or outside) a group — reparent if needed.
      const positionEnds = changes.filter(
        (c): c is NodePositionChange =>
          c.type === "position" && c.dragging === false && c.position != null,
      );
      if (positionEnds.length > 0) {
        const currentSpec = useSpecStore.getState().spec;
        for (const change of positionEnds) {
          const service = currentSpec.services.find((s) => s.id === change.id);
          if (!service) {
            // It's a group move, not a service — just apply position.
            applyPositionChanges([{ id: change.id, position: change.position! }]);
            continue;
          }

          // Find the node in localNodes to get its absolute position.
          // RF reports position relative to parentId if set, so we need
          // the absolute position for hit-testing against groups.
          const rfNode = localNodes.find((n) => n.id === change.id);
          const nodePos = change.position!;
          let absPos = nodePos;
          if (rfNode?.parentId) {
            const parentGroup = currentSpec.groups.find((g) => g.id === rfNode.parentId);
            const px = parentGroup?.position?.x ?? 0;
            const py = parentGroup?.position?.y ?? 0;
            absPos = { x: px + nodePos.x, y: py + nodePos.y };
          }

          // Hit-test: is the service's center inside any group?
          const cx = absPos.x + 110;
          const cy = absPos.y + 60;
          let targetGroupId: string | undefined;
          for (const group of currentSpec.groups) {
            const gx = group.position?.x ?? 0;
            const gy = group.position?.y ?? 0;
            const gw = group.size?.width ?? 400;
            const gh = group.size?.height ?? 300;
            if (cx >= gx && cx <= gx + gw && cy >= gy && cy <= gy + gh) {
              targetGroupId = group.id;
              break;
            }
          }

          // Compute the position for the new parent context.
          const newPosition = targetGroupId !== undefined
            ? { x: absPos.x - (currentSpec.groups.find((g) => g.id === targetGroupId)?.position?.x ?? 0),
                y: absPos.y - (currentSpec.groups.find((g) => g.id === targetGroupId)?.position?.y ?? 0) }
            : absPos;

          if (targetGroupId !== service.groupId) {
            // Reparent: moved into a different group (or out of a group).
            dispatchReparent(service.id, targetGroupId, newPosition);
          } else {
            // Same group (or still ungrouped) — just update position.
            applyPositionChanges([{ id: change.id, position: change.position! }]);
          }
        }
      }

      // On resize END, sync the final dimensions to the spec store.
      const dimensionEnds = changes.filter(
        (c): c is NodeDimensionChange =>
          c.type === "dimensions" && c.dimensions != null && c.resizing === false,
      );
      if (dimensionEnds.length > 0) {
        applyDimensionChanges(
          dimensionEnds.map((c) => ({
            id: c.id,
            dimensions: {
              width: c.dimensions!.width,
              height: c.dimensions!.height,
            },
          })),
        );
      }

      // Removals go to spec store immediately.
      const removeChanges = changes.filter(
        (c): c is NodeRemoveChange => c.type === "remove",
      );
      if (removeChanges.length > 0) {
        applyNodeRemovals(removeChanges.map((c) => c.id));
      }
    },
    [applyPositionChanges, applyDimensionChanges, applyNodeRemovals, dispatchReparent, localNodes],
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

  // ─── Drag-and-drop ──────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleCanvasDrop(e, rfInstance, spec, {
        addGroup: dispatchAddGroup,
        addService: dispatchAddService,
        addComponent: dispatchAddComponent,
        addEdge: dispatchAddEdge,
      });
    },
    [rfInstance, spec, dispatchAddGroup, dispatchAddService, dispatchAddComponent, dispatchAddEdge],
  );

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="relative h-full w-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={localNodes}
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
        {isEmpty && (
          <Panel position="top-center">
            <div className="mt-48 select-none text-center">
              <p className="text-lg text-gray-400">
                Drag items from the palette to start building
              </p>
              <p className="mt-1 text-sm text-gray-300">
                Or drop a pattern to start quickly
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
      <EdgeCreationModal
        pendingConnection={pendingConnection}
        error={edgeError}
        onCancel={onEdgeCancel}
        onSelectProtocol={onSelectProtocol}
        isDuplicate={isDuplicate}
      />
    </div>
  );
}
