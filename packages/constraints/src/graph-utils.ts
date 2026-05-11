import type { ArchitextSpec } from "@architext/schema";

export type AdjacencyList = Map<string, Set<string>>;

export function buildOutboundList(spec: ArchitextSpec): AdjacencyList {
  const list: AdjacencyList = new Map();
  for (const service of spec.services) list.set(service.id, new Set());
  for (const edge of spec.edges) {
    const neighbors = list.get(edge.from);
    if (neighbors) neighbors.add(edge.to);
  }
  return list;
}

export function buildInboundList(spec: ArchitextSpec): AdjacencyList {
  const list: AdjacencyList = new Map();
  for (const service of spec.services) list.set(service.id, new Set());
  for (const edge of spec.edges) {
    const neighbors = list.get(edge.to);
    if (neighbors) neighbors.add(edge.from);
  }
  return list;
}

export function buildUndirectedList(spec: ArchitextSpec): AdjacencyList {
  const list: AdjacencyList = new Map();
  for (const service of spec.services) list.set(service.id, new Set());
  for (const edge of spec.edges) {
    const fromNeighbors = list.get(edge.from);
    if (fromNeighbors) fromNeighbors.add(edge.to);
    const toNeighbors = list.get(edge.to);
    if (toNeighbors) toNeighbors.add(edge.from);
  }
  return list;
}

export function detectCycles(serviceIds: string[], outbound: AdjacencyList): string[][] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of serviceIds) color.set(id, WHITE);

  const cycles: string[][] = [];

  for (const start of serviceIds) {
    if (color.get(start) !== WHITE) continue;

    const stack: string[] = [];
    const path: string[] = [];

    stack.push(start);

    // Iterative DFS with explicit state
    const iterStack: Array<{ node: string; neighbors: string[]; idx: number }> = [];
    iterStack.push({ node: start, neighbors: [...(outbound.get(start) ?? [])], idx: 0 });
    color.set(start, GRAY);
    path.push(start);

    while (iterStack.length > 0) {
      const frame = iterStack[iterStack.length - 1];

      if (frame.idx < frame.neighbors.length) {
        const neighbor = frame.neighbors[frame.idx++];
        const neighborColor = color.get(neighbor);

        if (neighborColor === GRAY) {
          // Back edge — found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
          }
        } else if (neighborColor === WHITE) {
          color.set(neighbor, GRAY);
          path.push(neighbor);
          iterStack.push({ node: neighbor, neighbors: [...(outbound.get(neighbor) ?? [])], idx: 0 });
        }
      } else {
        color.set(frame.node, BLACK);
        iterStack.pop();
        path.pop();
      }
    }
  }

  return cycles;
}

export function findComponents(serviceIds: string[], undirected: AdjacencyList): Set<string>[] {
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (const start of serviceIds) {
    if (visited.has(start)) continue;

    const component = new Set<string>();
    const queue: string[] = [start];
    visited.add(start);

    while (queue.length > 0) {
      const node = queue.shift()!;
      component.add(node);

      for (const neighbor of undirected.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components;
}
