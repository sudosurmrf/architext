/**
 * @module @architext/web/canvas/nodes/node-types
 * Concepts: [[NodeTypeRegistry]], [[ReactFlowNodeTypes]]
 * Spec: §4.1 Layout (groups as frames, services as cards)
 * Depends on: [[GroupNode]], [[ServiceNode]]
 * Consumed by: [[Canvas]] (nodeTypes prop)
 */

import type { NodeTypes } from "@xyflow/react";
import { GroupNode } from "./GroupNode";
import { ServiceNode } from "./ServiceNode";

/**
 * Custom node type registry for React Flow.
 * Defined at module scope to avoid infinite re-renders.
 */
export const nodeTypes: NodeTypes = {
  group: GroupNode,
  service: ServiceNode,
};
