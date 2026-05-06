/**
 * @module @architext/web/lib/spec-mutations
 * Concepts: [[ImmutableMutation]], [[PureFunction]], [[SpecTransform]]
 * Spec: §4.3 Drop rules (mutations on valid drop); §4.5 Edge creation (self-loop/dup rejection); §4.7 Undo/redo (immutable snapshots)
 * Depends on: [[@architext/schema]] (ArchitextSpec, Group, Service, Edge, Component, Position, Size)
 * Consumed by: [[spec-store]] (wraps these in Zustand actions), [[history]] (snapshots before/after)
 */

import type {
  ArchitextSpec,
  Group,
  Service,
  Edge,
  Component,
  Position,
  Size,
  GroupKind,
  ServiceKind,
} from "@architext/schema";

// ─── Add ────────────────────────────────────────────────────────────────

export interface AddGroupParams {
  id: string;
  name: string;
  kind: GroupKind;
  position: Position;
  size: Size;
  network?: "public" | "private" | "internal";
}

export function addGroup(spec: ArchitextSpec, params: AddGroupParams): ArchitextSpec {
  const group: Group = {
    id: params.id,
    name: params.name,
    kind: params.kind,
    serviceIds: [],
    position: params.position,
    size: params.size,
    ...(params.network ? { network: params.network } : {}),
  };
  return { ...spec, groups: [...spec.groups, group] };
}

export interface AddServiceParams {
  id: string;
  name: string;
  kind: ServiceKind;
  position: Position;
  components: Component[];
  groupId?: string;
}

export function addService(spec: ArchitextSpec, params: AddServiceParams): ArchitextSpec {
  const service: Service = {
    id: params.id,
    name: params.name,
    kind: params.kind,
    position: params.position,
    components: [...params.components],
    ...(params.groupId ? { groupId: params.groupId } : {}),
  };

  let groups = spec.groups;
  if (params.groupId) {
    groups = spec.groups.map((g) =>
      g.id === params.groupId
        ? { ...g, serviceIds: [...g.serviceIds, params.id] }
        : g
    );
  }

  return { ...spec, groups, services: [...spec.services, service] };
}

export function addComponent(
  spec: ArchitextSpec,
  serviceId: string,
  component: Component,
): ArchitextSpec {
  const idx = spec.services.findIndex((s) => s.id === serviceId);
  if (idx === -1) throw new Error(`Service not found: ${serviceId}`);

  const service = spec.services[idx]!;
  const updated: Service = {
    ...service,
    components: [...service.components, component],
  };

  const services = [...spec.services];
  services[idx] = updated;
  return { ...spec, services };
}

// ─── Remove ─────────────────────────────────────────────────────────────

export function removeNode(spec: ArchitextSpec, nodeId: string): ArchitextSpec {
  // Check if it's a group
  const groupIdx = spec.groups.findIndex((g) => g.id === nodeId);
  if (groupIdx !== -1) {
    const group = spec.groups[groupIdx]!;
    // Unlink services from this group
    const services = spec.services.map((s) =>
      s.groupId === group.id ? { ...s, groupId: undefined } : s
    );
    const groups = spec.groups.filter((g) => g.id !== nodeId);
    return { ...spec, groups, services };
  }

  // It's a service — remove it and all edges referencing it
  const services = spec.services.filter((s) => s.id !== nodeId);
  const edges = spec.edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
  // Remove from any group's serviceIds
  const groups = spec.groups.map((g) =>
    g.serviceIds.includes(nodeId)
      ? { ...g, serviceIds: g.serviceIds.filter((sid) => sid !== nodeId) }
      : g
  );
  return { ...spec, groups, services, edges };
}

export function removeEdge(spec: ArchitextSpec, edgeId: string): ArchitextSpec {
  return { ...spec, edges: spec.edges.filter((e) => e.id !== edgeId) };
}

// ─── Edges ──────────────────────────────────────────────────────────────

export function addEdge(spec: ArchitextSpec, edge: Edge): ArchitextSpec {
  if (edge.from === edge.to) {
    throw new Error("self-loop: edge from and to must differ");
  }

  const isDuplicate = spec.edges.some(
    (e) => e.from === edge.from && e.to === edge.to && e.protocol === edge.protocol
  );
  if (isDuplicate) {
    throw new Error("duplicate: edge with same from/to/protocol already exists");
  }

  return { ...spec, edges: [...spec.edges, edge] };
}

// ─── Reparent ──────────────────────────────────────────────────────────

export function reparentService(
  spec: ArchitextSpec,
  serviceId: string,
  newGroupId: string | undefined,
  newPosition: Position,
): ArchitextSpec {
  const sIdx = spec.services.findIndex((s) => s.id === serviceId);
  if (sIdx === -1) return spec;

  const service = spec.services[sIdx]!;
  const oldGroupId = service.groupId;
  if (oldGroupId === newGroupId) {
    // Same group (or both ungrouped) — just update position.
    const services = [...spec.services];
    services[sIdx] = { ...service, position: newPosition };
    return { ...spec, services };
  }

  // Update the service's groupId + position.
  const updatedService: Service = {
    ...service,
    position: newPosition,
    ...(newGroupId !== undefined ? { groupId: newGroupId } : {}),
  };
  // If removing from group, strip groupId entirely.
  if (newGroupId === undefined) {
    delete (updatedService as Record<string, unknown>).groupId;
  }
  const services = [...spec.services];
  services[sIdx] = updatedService;

  // Update group serviceIds arrays.
  let groups = spec.groups;
  if (oldGroupId !== undefined) {
    groups = groups.map((g) =>
      g.id === oldGroupId
        ? { ...g, serviceIds: g.serviceIds.filter((sid) => sid !== serviceId) }
        : g,
    );
  }
  if (newGroupId !== undefined) {
    groups = groups.map((g) =>
      g.id === newGroupId && !g.serviceIds.includes(serviceId)
        ? { ...g, serviceIds: [...g.serviceIds, serviceId] }
        : g,
    );
  }

  return { ...spec, groups, services };
}

// ─── Move / Resize ─────────────────────────────────────────────────────

export function moveNode(spec: ArchitextSpec, nodeId: string, position: Position): ArchitextSpec {
  // Try groups first
  const gIdx = spec.groups.findIndex((g) => g.id === nodeId);
  if (gIdx !== -1) {
    const groups = [...spec.groups];
    groups[gIdx] = { ...groups[gIdx]!, position };
    return { ...spec, groups };
  }

  // Try services
  const sIdx = spec.services.findIndex((s) => s.id === nodeId);
  if (sIdx !== -1) {
    const services = [...spec.services];
    services[sIdx] = { ...services[sIdx]!, position };
    return { ...spec, services };
  }

  return spec;
}

export function resizeGroup(spec: ArchitextSpec, groupId: string, size: Size): ArchitextSpec {
  const idx = spec.groups.findIndex((g) => g.id === groupId);
  if (idx === -1) throw new Error(`Group not found: ${groupId}`);

  const oldGroup = spec.groups[idx]!;
  const oldW = oldGroup.size?.width ?? 400;
  const oldH = oldGroup.size?.height ?? 300;

  const groups = [...spec.groups];
  groups[idx] = { ...oldGroup, size };

  // Proportionally rescale children's positions so they stay
  // inside the group at any size. The user can zoom in/out on
  // the canvas to inspect small groups or see the big picture.
  const scaleX = oldW > 0 ? size.width / oldW : 1;
  const scaleY = oldH > 0 ? size.height / oldH : 1;

  const services = spec.services.map((s) => {
    if (s.groupId !== groupId) return s;
    return {
      ...s,
      position: {
        x: Math.round((s.position?.x ?? 0) * scaleX),
        y: Math.round((s.position?.y ?? 0) * scaleY),
      },
    };
  });

  return { ...spec, groups, services };
}

// ─── Duplicate ──────────────────────────────────────────────────────────

const DUP_OFFSET = 40;

export function duplicateNode(
  spec: ArchitextSpec,
  nodeId: string,
  newId: string,
): ArchitextSpec {
  // Try groups
  const group = spec.groups.find((g) => g.id === nodeId);
  if (group) {
    const dup: Group = {
      ...group,
      id: newId,
      name: `${group.name} (copy)`,
      serviceIds: [],
      position: { x: (group.position?.x ?? 0) + DUP_OFFSET, y: (group.position?.y ?? 0) + DUP_OFFSET },
    };
    return { ...spec, groups: [...spec.groups, dup] };
  }

  // Try services
  const service = spec.services.find((s) => s.id === nodeId);
  if (service) {
    const dup: Service = {
      ...service,
      id: newId,
      name: `${service.name} (copy)`,
      groupId: service.groupId,
      position: { x: (service.position?.x ?? 0) + DUP_OFFSET, y: (service.position?.y ?? 0) + DUP_OFFSET },
    };
    // If in a group, update the group's serviceIds too
    let groups = spec.groups;
    if (dup.groupId) {
      groups = spec.groups.map((g) =>
        g.id === dup.groupId ? { ...g, serviceIds: [...g.serviceIds, newId] } : g
      );
    }
    return { ...spec, groups, services: [...spec.services, dup] };
  }

  return spec;
}
