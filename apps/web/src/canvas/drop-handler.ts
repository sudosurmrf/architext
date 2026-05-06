/**
 * @module @architext/web/canvas/drop-handler
 * Concepts: [[DropHandler]], [[CanvasDrop]], [[DropDispatch]]
 * Spec: §4.3 Drop rules (dispatch on valid drop); §7.4 Patterns (atomic pattern instantiation)
 * Depends on: [[can-drop]], [[spec-store]], [[drag]] (DragItem, DropTarget), [[@architext/patterns]] (instantiatePattern, loadPatterns)
 * Consumed by: [[Canvas]] (onDrop handler)
 */

import type { ReactFlowInstance } from "@xyflow/react";
import type { ArchitextSpec } from "@architext/schema";
import { instantiatePattern, loadPatterns } from "@architext/patterns";
import type { DragItem, DropTarget } from "../types/drag";
import { canDrop } from "../lib/can-drop";
import type { SpecState } from "../store/spec-store";

const RF_NODE_SELECTOR = ".react-flow__node";

export interface DropHandlerResult {
  dropped: boolean;
  message?: string;
}

type SpecDispatch = Pick<
  SpecState,
  "addGroup" | "addService" | "addComponent" | "addEdge"
>;

/**
 * Determine the DropTarget using the DOM element under the cursor.
 * React Flow wraps every node in a div with class "react-flow__node" and
 * a data-id attribute, so we walk up the DOM from the element at the drop
 * point. This handles grouped (child) nodes correctly — Element.closest()
 * finds the innermost node first, so a service inside a group resolves as
 * a service, not the group.
 */
export function resolveDropTarget(
  clientX: number,
  clientY: number,
  spec: ArchitextSpec,
): DropTarget {
  const el = document.elementFromPoint(clientX, clientY);
  const nodeEl = el?.closest<HTMLElement>(RF_NODE_SELECTOR);

  if (nodeEl) {
    const nodeId = nodeEl.dataset.id;
    if (nodeId) {
      if (spec.services.some((s) => s.id === nodeId)) {
        return { zone: "service", serviceId: nodeId };
      }
      if (spec.groups.some((g) => g.id === nodeId)) {
        return { zone: "group", groupId: nodeId };
      }
    }
  }

  return { zone: "canvas" };
}

/**
 * Handle a valid drop: parse the DragItem from dataTransfer, validate, dispatch.
 */
export function handleCanvasDrop(
  event: React.DragEvent,
  rfInstance: ReactFlowInstance,
  spec: ArchitextSpec,
  dispatch: SpecDispatch,
): DropHandlerResult {
  const raw = event.dataTransfer.getData("application/architext");
  if (!raw) {
    return { dropped: false, message: "No drag data found" };
  }

  let dragItem: DragItem;
  try {
    dragItem = JSON.parse(raw) as DragItem;
  } catch {
    return { dropped: false, message: "Invalid drag data" };
  }

  const target = resolveDropTarget(
    event.clientX,
    event.clientY,
    spec,
  );
  const result = canDrop(dragItem, target, spec);

  if (!result.allowed) {
    console.warn(`[drop-handler] Drop rejected: ${result.reason}`);
    return { dropped: false, message: result.reason };
  }

  const flowPos = rfInstance.screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  });

  switch (dragItem.type) {
    case "group-token": {
      const id = crypto.randomUUID();
      let groupPos = flowPos;
      let parentGroupId: string | undefined;

      if (target.zone === "group") {
        parentGroupId = target.groupId;
        const parentGroup = spec.groups.find((g) => g.id === parentGroupId);
        if (parentGroup) {
          groupPos = {
            x: flowPos.x - (parentGroup.position?.x ?? 0),
            y: flowPos.y - (parentGroup.position?.y ?? 0),
          };
        }
      }

      dispatch.addGroup({
        id,
        name: dragItem.name,
        kind: dragItem.groupKind,
        position: groupPos,
        size: { width: 400, height: 300 },
        parentGroupId,
      });
      return { dropped: true };
    }

    case "service-token": {
      const id = crypto.randomUUID();
      let servicePos = flowPos;
      let groupId: string | undefined;

      if (target.zone === "group") {
        groupId = target.groupId;
        const group = spec.groups.find((g) => g.id === groupId);
        if (group) {
          // React Flow positions child nodes relative to their parent.
          // Convert absolute canvas position → relative to the group.
          servicePos = {
            x: flowPos.x - (group.position?.x ?? 0),
            y: flowPos.y - (group.position?.y ?? 0),
          };
        }
      }

      dispatch.addService({
        id,
        name: dragItem.name,
        kind: dragItem.serviceKind,
        position: servicePos,
        components: [],
        groupId,
      });
      return { dropped: true };
    }

    case "component-chip": {
      if (target.zone !== "service") {
        return { dropped: false, message: "Components must be dropped on a service" };
      }
      dispatch.addComponent(target.serviceId, {
        id: dragItem.catalogId,
        category: dragItem.category,
      });
      return { dropped: true };
    }

    case "pattern": {
      const patternLib = loadPatterns();
      const pattern = patternLib.byId(dragItem.patternId);
      if (!pattern) {
        return { dropped: false, message: `Pattern not found: ${dragItem.patternId}` };
      }

      const fragment = instantiatePattern(
        pattern,
        flowPos,
        () => crypto.randomUUID(),
      );

      // Add all groups, services, and edges atomically
      for (const group of fragment.groups) {
        dispatch.addGroup({
          id: group.id,
          name: group.name,
          kind: group.kind,
          position: group.position ?? { x: 0, y: 0 },
          size: group.size ?? { width: 400, height: 300 },
          network: group.network,
        });
      }
      for (const service of fragment.services) {
        dispatch.addService({
          id: service.id,
          name: service.name,
          kind: service.kind,
          position: service.position ?? { x: 0, y: 0 },
          components: service.components,
          groupId: service.groupId,
        });
      }
      for (const edge of fragment.edges) {
        dispatch.addEdge(edge);
      }

      return { dropped: true };
    }
  }
}
