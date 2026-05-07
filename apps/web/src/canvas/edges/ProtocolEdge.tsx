/**
 * @module @architext/web/canvas/edges/ProtocolEdge
 * Concepts: [[CustomEdge]], [[ProtocolBadge]], [[ProtocolColoring]]
 * Spec: §4.5 Edge creation (protocol badge on edges); §3 Edges (protocol types)
 * Depends on: [[to-react-flow]] (ProtocolEdgeData), @xyflow/react (EdgeProps, BaseEdge, getSmoothStepPath, EdgeLabelRenderer)
 * Consumed by: [[edge-types]] (registered as "protocol" edge type)
 */

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import type { ProtocolEdgeData } from "../../lib/to-react-flow";

/** Typed edge definition for the protocol edge */
type ProtocolEdgeType = Edge<ProtocolEdgeData, "protocol">;

/** Protocol-specific colors for edge stroke and badge */
const PROTOCOL_COLORS: Record<string, { stroke: string; bg: string; text: string }> = {
  http:        { stroke: "#3b82f6", bg: "#dbeafe", text: "#1d4ed8" },
  graphql:     { stroke: "#ec4899", bg: "#fce7f3", text: "#be185d" },
  grpc:        { stroke: "#f97316", bg: "#ffedd5", text: "#c2410c" },
  websocket:   { stroke: "#22c55e", bg: "#dcfce7", text: "#15803d" },
  queue:       { stroke: "#eab308", bg: "#fef9c3", text: "#a16207" },
  sql:         { stroke: "#6366f1", bg: "#e0e7ff", text: "#4338ca" },
  "key-value": { stroke: "#14b8a6", bg: "#ccfbf1", text: "#0f766e" },
  fs:          { stroke: "#6b7280", bg: "#f3f4f6", text: "#374151" },
  event:       { stroke: "#9333ea", bg: "#f3e8ff", text: "#7e22ce" },
  "object-storage": { stroke: "#0891b2", bg: "#cffafe", text: "#0e7490" },
  identity:    { stroke: "#10b981", bg: "#d1fae5", text: "#047857" },
  secret:      { stroke: "#ef4444", bg: "#fee2e2", text: "#b91c1c" },
  "container-image": { stroke: "#8b5cf6", bg: "#ede9fe", text: "#6d28d9" },
  "lambda-invoke": { stroke: "#d946ef", bg: "#fae8ff", text: "#a21caf" },
  dns:         { stroke: "#0ea5e9", bg: "#e0f2fe", text: "#0369a1" },
};

/** Protocol display labels */
const PROTOCOL_LABELS: Record<string, string> = {
  http: "HTTP",
  graphql: "GraphQL",
  grpc: "gRPC",
  websocket: "WebSocket",
  queue: "Queue",
  sql: "SQL",
  "key-value": "KV",
  fs: "FS",
  event: "Event",
  "object-storage": "Object",
  identity: "Identity",
  secret: "Secret",
  "container-image": "Image",
  "lambda-invoke": "Lambda",
  dns: "DNS",
};

function getProtocolColors(protocol: string) {
  return PROTOCOL_COLORS[protocol] ?? PROTOCOL_COLORS["fs"]!;
}

function getProtocolLabel(protocol: string) {
  return PROTOCOL_LABELS[protocol] ?? protocol.toUpperCase();
}

export function ProtocolEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
  style,
}: EdgeProps<ProtocolEdgeType>) {
  const protocol = data?.protocol ?? "http";
  const colors = getProtocolColors(protocol);
  const label = getProtocolLabel(protocol);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: colors.stroke,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: selected ? "5 3" : undefined,
          animation: selected ? "edgeDash 0.5s linear infinite" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none shadow-sm"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.stroke}`,
            }}
          >
            {label}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
