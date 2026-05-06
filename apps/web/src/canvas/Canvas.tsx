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
  const applyNodeRemovals = useSpecStore((s) => s.applyNodeRemovals);
  const applyEdgeRemovals = useSpecStore((s) => s.applyEdgeRemovals);
  const dispatchAddGroup = useSpecStore((s) => s.addGroup);
  const dispatchAddService = useSpecStore((s) => s.addService);
  const dispatchAddComponent = useSpecStore((s) => s.addComponent);
  const dispatchAddEdge = useSpecStore((s) => s.addEdge);
  const dispatchReparent = useSpecStore((s) => s.reparentService);
  const dispatchReparentGroup = useSpecStore((s) => s.reparentGroup);
  const dispatchResizeGroup = useSpecStore((s) => s.resizeGroup);

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
      // positions on the very next frame. When a group is being
      // resized, also proportionally adjust children so they scale
      // with the group (flex-like behavior).
      setLocalNodes((prev) => {
        let nodes = applyNodeChanges(changes, prev) as Node[];

        for (const change of changes) {
          if (change.type !== "dimensions" || !change.dimensions || !change.resizing) continue;

          const oldNode = prev.find((n) => n.id === change.id);
          if (!oldNode || oldNode.type !== "group") continue;

          const oldW = oldNode.measured?.width ?? (oldNode.style?.width as number | undefined) ?? 400;
          const oldH = oldNode.measured?.height ?? (oldNode.style?.height as number | undefined) ?? 300;
          if (oldW <= 0 || oldH <= 0) continue;

          const scaleX = change.dimensions.width / oldW;
          const scaleY = change.dimensions.height / oldH;

          // Collect all descendants (services AND nested groups) via BFS.
          const descendants = new Set<string>();
          const queue = [change.id];
          while (queue.length > 0) {
            const pid = queue.shift()!;
            for (const n of prev) {
              if (n.parentId === pid && !descendants.has(n.id)) {
                descendants.add(n.id);
                queue.push(n.id);
              }
            }
          }

          nodes = nodes.map((n) => {
            if (!descendants.has(n.id)) return n;
            const scaled = {
              ...n,
              position: { x: Math.round(n.position.x * scaleX), y: Math.round(n.position.y * scaleY) },
            };
            if (n.type === "group") {
              const w = n.measured?.width ?? (n.style?.width as number | undefined) ?? 400;
              const h = n.measured?.height ?? (n.style?.height as number | undefined) ?? 300;
              return { ...scaled, style: { ...scaled.style, width: Math.round(w * scaleX), height: Math.round(h * scaleY) } };
            }
            return scaled;
          });
        }

        return nodes;
      });

      // On drag END, sync positions AND check if any node (service or
      // group) landed inside a different group — reparent if needed.
      const positionEnds = changes.filter(
        (c): c is NodePositionChange =>
          c.type === "position" && c.dragging === false && c.position != null,
      );
      if (positionEnds.length > 0) {
        const currentSpec = useSpecStore.getState().spec;

        // Walk up the parent chain to compute absolute canvas position.
        const toAbsolute = (pos: { x: number; y: number }, parentId: string | undefined) => {
          let x = pos.x, y = pos.y;
          let pid = parentId;
          while (pid) {
            const pg = currentSpec.groups.find((g) => g.id === pid);
            if (!pg) break;
            x += pg.position?.x ?? 0;
            y += pg.position?.y ?? 0;
            pid = pg.parentGroupId;
          }
          return { x, y };
        };

        for (const change of positionEnds) {
          const rfNode = localNodes.find((n) => n.id === change.id);
          const nodePos = change.position!;
          const absPos = toAbsolute(nodePos, rfNode?.parentId);

          const service = currentSpec.services.find((s) => s.id === change.id);
          const draggedGroup = currentSpec.groups.find((g) => g.id === change.id);

          if (!service && !draggedGroup) {
            applyPositionChanges([{ id: change.id, position: nodePos }]);
            continue;
          }

          // Center for hit-testing
          const halfW = service ? 110 : (draggedGroup!.size?.width ?? 400) / 2;
          const halfH = service ? 60 : (draggedGroup!.size?.height ?? 300) / 2;
          const cx = absPos.x + halfW;
          const cy = absPos.y + halfH;

          // For groups: exclude self + descendants to prevent cycles.
          const excluded = new Set<string>();
          if (draggedGroup) {
            excluded.add(draggedGroup.id);
            const queue = [draggedGroup.id];
            while (queue.length > 0) {
              const id = queue.shift()!;
              for (const g of currentSpec.groups) {
                if (g.parentGroupId === id && !excluded.has(g.id)) {
                  excluded.add(g.id);
                  queue.push(g.id);
                }
              }
            }
          }

          // Hit-test: find the smallest (innermost) group whose absolute
          // bounds contain the dragged node's center.
          let targetGroupId: string | undefined;
          let bestArea = Infinity;
          for (const group of currentSpec.groups) {
            if (excluded.has(group.id)) continue;
            const gAbs = toAbsolute(group.position ?? { x: 0, y: 0 }, group.parentGroupId);
            const gw = group.size?.width ?? 400;
            const gh = group.size?.height ?? 300;
            if (cx >= gAbs.x && cx <= gAbs.x + gw && cy >= gAbs.y && cy <= gAbs.y + gh) {
              const area = gw * gh;
              if (area < bestArea) { targetGroupId = group.id; bestArea = area; }
            }
          }

          // Convert absolute position → relative to target group.
          let newPosition = absPos;
          if (targetGroupId !== undefined) {
            const tg = currentSpec.groups.find((g) => g.id === targetGroupId)!;
            const tAbs = toAbsolute(tg.position ?? { x: 0, y: 0 }, tg.parentGroupId);
            newPosition = { x: absPos.x - tAbs.x, y: absPos.y - tAbs.y };
          }

          if (service) {
            if (targetGroupId !== service.groupId) {
              dispatchReparent(service.id, targetGroupId, newPosition);
            } else {
              applyPositionChanges([{ id: change.id, position: change.position! }]);
            }
          } else {
            if (targetGroupId !== draggedGroup!.parentGroupId) {
              dispatchReparentGroup(draggedGroup!.id, targetGroupId, newPosition);
            } else {
              applyPositionChanges([{ id: change.id, position: change.position! }]);
            }
          }
        }
      }

      // On resize END, commit to the spec via resizeGroup which
      // proportionally rescales children from the original spec positions.
      const dimensionEnds = changes.filter(
        (c): c is NodeDimensionChange =>
          c.type === "dimensions" && c.dimensions != null && c.resizing === false,
      );
      for (const change of dimensionEnds) {
        dispatchResizeGroup(change.id, {
          width: change.dimensions!.width,
          height: change.dimensions!.height,
        });
      }

      // Removals go to spec store immediately.
      const removeChanges = changes.filter(
        (c): c is NodeRemoveChange => c.type === "remove",
      );
      if (removeChanges.length > 0) {
        applyNodeRemovals(removeChanges.map((c) => c.id));
      }
    },
    [applyPositionChanges, dispatchResizeGroup, applyNodeRemovals, dispatchReparent, dispatchReparentGroup, localNodes],
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
