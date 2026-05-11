/**
 * @module @architext/web/canvas/nodes/ServiceNode
 * Concepts: [[CustomNode]], [[ServiceCard]], [[ComponentChips]], [[EdgeHandles]]
 * Spec: §4.1 Layout (services as cards with component chips); §4.5 Edge handles on all four sides
 * Depends on: [[to-react-flow]] (ServiceNodeData), @xyflow/react (NodeProps, Handle, Position)
 * Consumed by: [[node-types]] (registered as "service" node type)
 */

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import {
  Monitor,
  Server,
  Cpu,
  Database,
  Zap,
  MessageSquare,
  Box,
  Globe,
  CloudCog,
  Bot,
  BrainCircuit,
  UserCheck,
  GitBranch,
} from "lucide-react";
import type { ComponentType } from "react";
import type { ServiceNodeData } from "../../lib/to-react-flow";

/** Typed node definition for the service node */
type ServiceNodeType = Node<ServiceNodeData, "service">;

/** Category-based chip color classes */
const CATEGORY_COLORS: Record<string, string> = {
  language: "bg-slate-100 text-slate-700",
  framework: "bg-blue-100 text-blue-700",
  library: "bg-violet-100 text-violet-700",
  "build-tool": "bg-amber-100 text-amber-700",
  datastore: "bg-emerald-100 text-emerald-700",
  infrastructure: "bg-sky-100 text-sky-700",
  ai: "bg-fuchsia-100 text-fuchsia-700",
  workflow: "bg-indigo-100 text-indigo-700",
  auth: "bg-rose-100 text-rose-700",
  runtime: "bg-teal-100 text-teal-700",
  "entry-point": "bg-gray-100 text-gray-700",
};

/** Kind icon mapping */
const KIND_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "frontend-app": Monitor,
  "backend-service": Server,
  worker: Cpu,
  database: Database,
  cache: Zap,
  queue: MessageSquare,
  infrastructure: CloudCog,
  "ai-model": BrainCircuit,
  "ai-agent": Bot,
  "human-step": UserCheck,
  decision: GitBranch,
  sidecar: Box,
  "external-api": Globe,
};

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-600";
}

export function ServiceNode({ data, selected }: NodeProps<ServiceNodeType>) {
  const KindIcon = KIND_ICONS[data.kind] ?? Box;

  return (
    <div
      className={`group relative min-w-[180px] rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-blue-400 shadow-md" : "border-gray-200"
      }`}
    >
      {/* Edge handles — hidden by default, shown on hover */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !rounded-full !border-gray-300 !bg-white opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !rounded-full !border-gray-300 !bg-white opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* Header: icon + name */}
      <div className="mb-2 flex items-center gap-2">
        <KindIcon className="h-4 w-4 text-gray-500" />
        <span className="truncate text-sm font-medium text-gray-800">
          {data.name}
        </span>
      </div>

      {/* Component chips */}
      {data.components.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.components.map((c) => (
            <span
              key={c.id}
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${categoryColor(c.category)}`}
            >
              {c.id}
            </span>
          ))}
        </div>
      )}

      {/* Source handles */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !rounded-full !border-gray-300 !bg-white opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !rounded-full !border-gray-300 !bg-white opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}
