/**
 * @module @architext/web/types/drag
 * Concepts: [[DragItem]], [[DiscriminatedUnion]], [[PaletteToken]]
 * Spec: §4.3 Drop rules — four palette token types (group, service, component, pattern)
 * Depends on: [[@architext/schema]] (GroupKind, ServiceKind, ComponentCategory)
 * Consumed by: [[can-drop]] (validates drop target), [[drop-handler]] (dispatches mutation), [[PalettePanel]] (attaches to drag events)
 */

import type { GroupKind, ServiceKind, ComponentCategory } from "@architext/schema";

/**
 * Discriminated union for items dragged from the palette onto the canvas.
 * The `type` field is the discriminant.
 */
export type DragItem =
  | GroupToken
  | ServiceToken
  | ComponentChip
  | PatternDrop;

export interface GroupToken {
  readonly type: "group-token";
  readonly groupKind: GroupKind;
  readonly name: string;
}

export interface ServiceToken {
  readonly type: "service-token";
  readonly serviceKind: ServiceKind;
  readonly name: string;
  /** Catalog entry id, e.g. "postgres" — used when the service is created from a datastore entry */
  readonly catalogId?: string;
  readonly category?: ComponentCategory;
  readonly defaultVersion?: string;
  readonly defaultConfig?: Record<string, unknown>;
}

export interface ComponentChip {
  readonly type: "component-chip";
  readonly catalogId: string;
  readonly category: ComponentCategory;
  readonly name: string;
  readonly defaultVersion?: string;
  readonly defaultConfig?: Record<string, unknown>;
}

export interface PatternDrop {
  readonly type: "pattern";
  readonly patternId: string;
  readonly name: string;
}

/**
 * Describes where on the canvas a drag item is being hovered/dropped.
 */
export type DropTarget =
  | { readonly zone: "canvas" }
  | { readonly zone: "group"; readonly groupId: string }
  | { readonly zone: "service"; readonly serviceId: string };
