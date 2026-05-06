/**
 * @module @architext/web/lib/to-react-flow
 * Concepts: [[SpecToRF]], [[PureFunction]], [[NodeConversion]], [[EdgeConversion]]
 * Spec: §4.1 Layout (groups as parent frames, services as cards); §4.5 Edge creation (protocol badge)
 * Depends on: [[@architext/schema]] (ArchitextSpec, Group, Service, Edge)
 * Consumed by: [[Canvas]] (renders the RF graph), [[spec-store]] (selector)
 */

import type { ArchitextSpec, Group, Service, Edge } from "@architext/schema";
import type { Node, Edge as RFEdge } from "@xyflow/react";

/** Data attached to group nodes */
export interface GroupNodeData {
  name: string;
  kind: string;
  network?: string;
  [key: string]: unknown;
}

/** Data attached to service nodes */
export interface ServiceNodeData {
  name: string;
  kind: string;
  components: Array<{ id: string; category: string; version?: string }>;
  [key: string]: unknown;
}

/** Data attached to protocol edges */
export interface ProtocolEdgeData {
  protocol: string;
  [key: string]: unknown;
}

export interface RFGraph {
  nodes: Node[];
  edges: RFEdge[];
}

/**
 * Converts an ArchitextSpec into React Flow nodes and edges.
 * Groups are emitted before their child services to satisfy RF parent ordering.
 */
export function specToReactFlow(spec: ArchitextSpec): RFGraph {
  const nodes: Node[] = [];

  // Groups first (parents must appear before children in RF)
  for (const group of spec.groups) {
    nodes.push(groupToNode(group));
  }

  // Then services
  for (const service of spec.services) {
    nodes.push(serviceToNode(service));
  }

  // Edges
  const edges: RFEdge[] = spec.edges.map(edgeToRFEdge);

  return { nodes, edges };
}

function groupToNode(group: Group): Node {
  return {
    id: group.id,
    type: "group",
    position: group.position,
    data: {
      name: group.name,
      kind: group.kind,
      ...(group.network ? { network: group.network } : {}),
    } satisfies GroupNodeData,
    style: {
      width: group.size.width,
      height: group.size.height,
    },
    draggable: true,
    selectable: true,
  };
}

function serviceToNode(service: Service): Node {
  return {
    id: service.id,
    type: "service",
    position: service.position,
    ...(service.groupId ? { parentId: service.groupId } : {}),
    data: {
      name: service.name,
      kind: service.kind,
      components: service.components.map((c) => ({
        id: c.id,
        category: c.category,
        ...(c.version ? { version: c.version } : {}),
      })),
    } satisfies ServiceNodeData,
    draggable: true,
    selectable: true,
  };
}

function edgeToRFEdge(edge: Edge): RFEdge {
  // Spread all edge-specific fields into data
  const { id, from, to, ...rest } = edge;
  return {
    id,
    source: from,
    target: to,
    type: "protocol",
    data: rest as ProtocolEdgeData,
  };
}
