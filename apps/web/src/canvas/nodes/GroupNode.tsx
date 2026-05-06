/**
 * @module @architext/web/canvas/nodes/GroupNode
 * Concepts: [[CustomNode]], [[GroupFrame]], [[Resizable]], [[DragHandle]]
 * Spec: §4.1 Layout (groups as parent frames with dashed border, tinted background)
 * Depends on: [[to-react-flow]] (GroupNodeData), @xyflow/react (NodeProps, NodeResizer)
 * Consumed by: [[node-types]] (registered as "group" node type)
 */

import type { Node, NodeProps } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";
import type { GroupNodeData } from "../../lib/to-react-flow";

/** Typed node definition for the group node */
type GroupNodeType = Node<GroupNodeData, "group">;

/** Background tint by group kind */
const KIND_COLORS: Record<string, { border: string; bg: string; badge: string }> = {
  backend: {
    border: "border-blue-300",
    bg: "bg-blue-50/50",
    badge: "bg-blue-100 text-blue-700",
  },
  frontend: {
    border: "border-green-300",
    bg: "bg-green-50/50",
    badge: "bg-green-100 text-green-700",
  },
  data: {
    border: "border-amber-300",
    bg: "bg-amber-50/50",
    badge: "bg-amber-100 text-amber-700",
  },
  infrastructure: {
    border: "border-purple-300",
    bg: "bg-purple-50/50",
    badge: "bg-purple-100 text-purple-700",
  },
};

const DEFAULT_COLORS = {
  border: "border-gray-300",
  bg: "bg-gray-50/50",
  badge: "bg-gray-100 text-gray-700",
};

export function GroupNode({ data, selected }: NodeProps<GroupNodeType>) {
  const colors = KIND_COLORS[data.kind] ?? DEFAULT_COLORS;

  return (
    <div
      className={`relative h-full w-full rounded-lg border-2 border-dashed ${colors.border} ${colors.bg} ${
        selected ? "border-solid shadow-lg ring-2 ring-blue-400" : ""
      }`}
      style={{ width: "100%", height: "100%" }}
    >
      <NodeResizer
        minWidth={data.minWidth}
        minHeight={data.minHeight}
        isVisible={selected ?? false}
        lineClassName="!border-blue-400"
        handleClassName="!h-2 !w-2 !rounded-sm !border-blue-400 !bg-white"
      />

      {/* Header — acts as drag handle */}
      <div className="drag-handle flex items-center gap-2 px-3 py-1.5">
        <span className="text-sm font-semibold text-gray-700 truncate">
          {data.name}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.badge}`}>
          {data.kind}
        </span>
        {data.network && (
          <span className="text-[10px] text-gray-400" title={`Network: ${data.network}`}>
            {data.network === "public" ? "🌐" : "🔒"}
          </span>
        )}
      </div>
    </div>
  );
}
