/**
 * @module @architext/web/canvas/edges/edge-types
 * Concepts: [[EdgeTypeRegistry]], [[ReactFlowEdgeTypes]]
 * Spec: §4.5 Edge creation (protocol badge on edges)
 * Depends on: [[ProtocolEdge]]
 * Consumed by: [[Canvas]] (edgeTypes prop)
 */

import type { EdgeTypes } from "@xyflow/react";
import { ProtocolEdge } from "./ProtocolEdge";

/**
 * Custom edge type registry for React Flow.
 * Defined at module scope to avoid infinite re-renders.
 */
export const edgeTypes: EdgeTypes = {
  protocol: ProtocolEdge,
};
