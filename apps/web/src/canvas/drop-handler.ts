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

export interface DropHandlerResult {
  dropped: boolean;
  message?: string;
}

type SpecDispatch = Pick<
  SpecState,
  "addGroup" | "addService" | "addComponent" | "addEdge"
>;

/**
 * Determine the DropTarget from the canvas coordinates and current spec.
 * Checks if the drop position is inside a group bounds or a service bounds.
 */
export function resolveDropTarget(
  clientX: number,
  clientY: number,
  rfInstance: ReactFlowInstance,
  spec: ArchitextSpec,
): DropTarget {
  const position = rfInstance.screenToFlowPosition({ x: clientX, y: clientY });

  // Check services first (more specific target)
  for (const service of spec.services) {
    const sx = service.position.x;
    const sy = service.position.y;
    // Service nodes have an approximate size; use a reasonable default
    const sw = 200;
    const sh = 100;
    if (
      position.x >= sx &&
      position.x <= sx + sw &&
      position.y >= sy &&
      position.y <= sy + sh
    ) {
      return { zone: "service", serviceId: service.id };
    }
  }

  // Check groups
  for (const group of spec.groups) {
    const gx = group.position.x;
    const gy = group.position.y;
    const gw = group.size.width;
    const gh = group.size.height;
    if (
      position.x >= gx &&
      position.x <= gx + gw &&
      position.y >= gy &&
      position.y <= gy + gh
    ) {
      return { zone: "group", groupId: group.id };
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
    rfInstance,
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
      dispatch.addGroup({
        id,
        name: dragItem.name,
        kind: dragItem.groupKind,
        position: flowPos,
        size: { width: 400, height: 300 },
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
            x: flowPos.x - group.position.x,
            y: flowPos.y - group.position.y,
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
          position: group.position,
          size: group.size,
          network: group.network,
        });
      }
      for (const service of fragment.services) {
        dispatch.addService({
          id: service.id,
          name: service.name,
          kind: service.kind,
          position: service.position,
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
