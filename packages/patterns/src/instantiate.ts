/**
 * @module @architext/patterns/instantiate
 * Concepts: [[InstantiatePattern]], [[IdRemap]], [[PositionOffset]]
 * Spec: §7.4 Patterns library — atomic insert: fresh ids, re-pointed refs, offset position
 * Depends on: [[@architext/schema]] (Group, Service, Edge), [[types]] (Pattern)
 * Consumed by: [[@architext/web]] (canvas drop handler)
 */

import type { Group, Service, Edge, Position } from "@architext/schema";
import type { Pattern } from "./types";

export interface InstantiatedFragment {
  groups: Group[];
  services: Service[];
  edges: Edge[];
}

export type IdGenerator = () => string;

export function instantiatePattern(
  pattern: Pattern,
  dropPoint: Position,
  idGen: IdGenerator
): InstantiatedFragment {
  const groupIdMap = new Map<string, string>();
  const serviceIdMap = new Map<string, string>();

  // Pre-compute group sizes from their children's offsets so frames
  // actually contain all the services placed inside them.
  const SERVICE_CARD_WIDTH = 220;
  const SERVICE_CARD_HEIGHT = 120;
  const GROUP_PADDING = 40;
  const GROUP_HEADER = 40;

  function computeGroupSize(tmpGroupId: string): { width: number; height: number } {
    const children = pattern.fragment.services.filter((s) => s.tmpGroupId === tmpGroupId);
    if (children.length === 0) return { width: 400, height: 300 };
    let maxX = 0;
    let maxY = 0;
    for (const c of children) {
      const ox = (c.offset?.x ?? 0) + SERVICE_CARD_WIDTH;
      const oy = (c.offset?.y ?? 0) + SERVICE_CARD_HEIGHT;
      if (ox > maxX) maxX = ox;
      if (oy > maxY) maxY = oy;
    }
    return {
      width: maxX + GROUP_PADDING * 2,
      height: maxY + GROUP_PADDING + GROUP_HEADER,
    };
  }

  const groups: Group[] = (pattern.fragment.groups ?? []).map((g) => {
    const id = idGen();
    if (g.tmpId) groupIdMap.set(g.tmpId, id);
    const size = g.tmpId !== undefined ? computeGroupSize(g.tmpId) : { width: 400, height: 300 };
    return {
      id,
      name: g.name,
      kind: g.kind,
      serviceIds: [],
      position: { x: dropPoint.x, y: dropPoint.y },
      size,
      ...(g.network !== undefined ? { network: g.network } : {}),
    };
  });

  const services: Service[] = pattern.fragment.services.map((s) => {
    const id = idGen();
    if (s.tmpId) serviceIdMap.set(s.tmpId, id);
    const offset = s.offset ?? { x: 0, y: 0 };
    const groupId = s.tmpGroupId !== undefined ? groupIdMap.get(s.tmpGroupId) : undefined;
    if (s.tmpGroupId !== undefined && groupId === undefined) {
      throw new Error(`unknown tmpId: ${s.tmpGroupId}`);
    }
    return {
      id,
      name: s.name,
      kind: s.kind,
      ...(groupId !== undefined ? { groupId } : {}),
      position: groupId !== undefined
        ? { x: offset.x, y: offset.y }
        : { x: dropPoint.x + offset.x, y: dropPoint.y + offset.y },
      components: (s.components ?? []).map((c) => ({
        id: c.id,
        category: c.category,
        ...(c.version !== undefined ? { version: c.version } : {}),
        ...(c.config !== undefined ? { config: c.config } : {}),
      })),
    };
  });

  // Re-populate group.serviceIds based on tmpGroupId pointers
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]!;
    const tmpGid = pattern.fragment.groups?.[i]?.tmpId;
    if (tmpGid !== undefined) {
      g.serviceIds = pattern.fragment.services
        .filter((s) => s.tmpGroupId === tmpGid)
        .map((s) => serviceIdMap.get(s.tmpId!)!)
        .filter((x): x is string => x !== undefined);
    }
  }

  const edges: Edge[] = pattern.fragment.edges.map((e) => {
    const from = serviceIdMap.get(e.from);
    const to = serviceIdMap.get(e.to);
    if (from === undefined) throw new Error(`unknown tmpId: ${e.from}`);
    if (to === undefined) throw new Error(`unknown tmpId: ${e.to}`);
    const id = idGen();
    // Build the edge using the discriminant; spread protocol-specific fields.
    switch (e.protocol) {
      case "http":
        return { id, from, to, protocol: "http",
          ...(e.port !== undefined ? { port: e.port } : {}),
          ...(e.basePath !== undefined ? { basePath: e.basePath } : {}) };
      case "graphql":
        return { id, from, to, protocol: "graphql",
          ...(e.port !== undefined ? { port: e.port } : {}),
          ...(e.path !== undefined ? { path: e.path } : {}) };
      case "grpc":
        return { id, from, to, protocol: "grpc",
          ...(e.port !== undefined ? { port: e.port } : {}) };
      case "websocket":
        return { id, from, to, protocol: "websocket",
          ...(e.port !== undefined ? { port: e.port } : {}),
          ...(e.path !== undefined ? { path: e.path } : {}) };
      case "queue":
        return { id, from, to, protocol: "queue", topicName: e.topicName ?? "default",
          ...(e.broker !== undefined ? { broker: e.broker } : {}) };
      case "sql":
        return { id, from, to, protocol: "sql",
          ...(e.database !== undefined ? { database: e.database } : {}),
          ...(e.port !== undefined ? { port: e.port } : {}) };
      case "key-value":
        return { id, from, to, protocol: "key-value",
          ...(e.namespace !== undefined ? { namespace: e.namespace } : {}) };
      case "fs":
        return { id, from, to, protocol: "fs",
          ...(e.mountPath !== undefined ? { mountPath: e.mountPath } : {}) };
      case "event":
        return { id, from, to, protocol: "event",
          ...(e.eventBus !== undefined ? { eventBus: e.eventBus } : {}),
          ...(e.source !== undefined ? { source: e.source } : {}),
          ...(e.detailType !== undefined ? { detailType: e.detailType } : {}) };
      case "object-storage":
        return { id, from, to, protocol: "object-storage",
          ...(e.bucket !== undefined ? { bucket: e.bucket } : {}),
          ...(e.prefix !== undefined ? { prefix: e.prefix } : {}) };
      case "identity":
        return { id, from, to, protocol: "identity",
          ...(e.provider !== undefined ? { provider: e.provider } : {}),
          ...(e.scopes !== undefined ? { scopes: e.scopes } : {}) };
      case "secret":
        return { id, from, to, protocol: "secret",
          ...(e.namespace !== undefined ? { namespace: e.namespace } : {}) };
      case "container-image":
        return { id, from, to, protocol: "container-image",
          ...(e.repository !== undefined ? { repository: e.repository } : {}),
          ...(e.tag !== undefined ? { tag: e.tag } : {}) };
      case "lambda-invoke":
        return { id, from, to, protocol: "lambda-invoke",
          ...(e.functionName !== undefined ? { functionName: e.functionName } : {}),
          ...(e.invocationType !== undefined ? { invocationType: e.invocationType } : {}),
          ...(e.qualifier !== undefined ? { qualifier: e.qualifier } : {}),
          ...(e.endpointVisibility !== undefined ? { endpointVisibility: e.endpointVisibility } : {}),
          ...(e.authorizer !== undefined ? { authorizer: e.authorizer } : {}) };
      case "human-review":
        return { id, from, to, protocol: "human-review",
          ...(e.reviewType !== undefined ? { reviewType: e.reviewType } : {}),
          ...(e.assignee !== undefined ? { assignee: e.assignee } : {}),
          ...(e.sla !== undefined ? { sla: e.sla } : {}),
          ...(e.instructions !== undefined ? { instructions: e.instructions } : {}) };
      case "decision":
        return { id, from, to, protocol: "decision",
          ...(e.condition !== undefined ? { condition: e.condition } : {}),
          ...(e.branchLabel !== undefined ? { branchLabel: e.branchLabel } : {}),
          ...(e.fallback !== undefined ? { fallback: e.fallback } : {}) };
      case "dns":
        return { id, from, to, protocol: "dns",
          ...(e.domainName !== undefined ? { domainName: e.domainName } : {}),
          ...(e.recordType !== undefined ? { recordType: e.recordType } : {}) };
    }
  });

  return { groups, services, edges };
}
