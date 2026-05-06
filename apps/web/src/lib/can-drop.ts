/**
 * @module @architext/web/lib/can-drop
 * Concepts: [[CanDrop]], [[DropValidation]], [[PureFunction]]
 * Spec: §4.3 Drop rules table (verbatim); §4.4 Component compatibility (per-ServiceKind allowlists)
 * Depends on: [[drag]] (DragItem, DropTarget), [[@architext/schema]] (ArchitextSpec, ServiceKind)
 * Consumed by: [[drop-handler]] (final validation), [[PalettePanel]] (hover highlighting), [[Canvas]] (drop zone detection)
 */

import type { ArchitextSpec, ServiceKind, ComponentCategory } from "@architext/schema";
import type { DragItem, DropTarget } from "../types/drag";

export type DropResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

const ok: DropResult = { allowed: true };
const reject = (reason: string): DropResult => ({ allowed: false, reason });

/**
 * Component categories accepted by each service kind.
 * From PRD §4.4.
 */
const COMPATIBLE_CATEGORIES: Record<ServiceKind, readonly ComponentCategory[]> = {
  "frontend-app": ["language", "framework", "library", "build-tool", "auth", "entry-point"],
  "backend-service": ["language", "runtime", "framework", "library", "auth", "entry-point"],
  worker: ["language", "runtime", "framework", "library", "auth", "entry-point"],
  database: ["datastore"],
  cache: ["datastore"],
  queue: ["datastore"],
  sidecar: ["language", "runtime", "framework", "library", "entry-point"],
  "external-api": ["entry-point"],
};

/**
 * Pure drop validator. Consulted on hover (highlights valid targets) and
 * on drop (final check). Single source of truth for drag-drop validation.
 *
 * @param item     - The palette item being dragged
 * @param target   - Where the item is being hovered/dropped
 * @param spec     - Current spec state (read-only)
 * @returns        - Whether the drop is allowed, with reason if rejected
 */
export function canDrop(item: DragItem, target: DropTarget, spec: ArchitextSpec): DropResult {
  switch (item.type) {
    case "group-token":
      return canDropGroup(target);

    case "service-token":
      return canDropService(target);

    case "component-chip":
      return canDropComponent(item, target, spec);

    case "pattern":
      return canDropPattern(target);
  }
}

function canDropGroup(target: DropTarget): DropResult {
  if (target.zone === "canvas") return ok;
  if (target.zone === "group") return reject("Group nesting is not allowed in v1.");
  return reject("Groups cannot be dropped inside a service.");
}

function canDropService(target: DropTarget): DropResult {
  if (target.zone === "canvas") return ok;
  if (target.zone === "group") return ok;
  return reject("Services cannot be nested inside other services.");
}

function canDropComponent(
  item: DragItem & { type: "component-chip" },
  target: DropTarget,
  spec: ArchitextSpec,
): DropResult {
  if (target.zone === "canvas") {
    return reject("Components must be dropped inside a Service.");
  }
  if (target.zone === "group") {
    return reject("Components belong to a Service. Drop a Service first.");
  }

  // target.zone === "service"
  const service = spec.services.find((s) => s.id === target.serviceId);
  if (!service) {
    return reject("Target service not found.");
  }

  // Check if component is already present
  if (service.components.some((c) => c.id === item.catalogId)) {
    return reject(`${item.name} is already in this service.`);
  }

  // Check category compatibility
  const allowed = COMPATIBLE_CATEGORIES[service.kind];
  if (!allowed || !allowed.includes(item.category)) {
    return reject(
      `${item.category} components are not compatible with ${service.kind} services.`
    );
  }

  return ok;
}

function canDropPattern(target: DropTarget): DropResult {
  if (target.zone === "canvas") return ok;
  return reject("Patterns can only be dropped on the canvas.");
}
