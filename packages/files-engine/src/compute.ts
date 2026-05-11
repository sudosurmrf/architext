/**
 * @module @architext/files-engine/compute
 * Concepts: [[ComputeFileTree]], [[Determinism]], [[GroupRule]], [[ServicePathPrefix]]
 * Spec: §7.3 File-tree rules engine — pure function consumed by web app and CLI; soft contract with the agent
 * Depends on: [[@architext/schema]] (ArchitextSpec), [[@architext/catalog]] (Catalog), [[apply-when]], [[always-files]]
 * Consumed by: [[index]] (re-export), [[@architext/web]] (Files tab), [[@architext/cli]] (prompt enrichment)
 */

import type { ArchitextSpec } from "@architext/schema";
import type { Catalog } from "@architext/catalog";
import type { FileTree } from "./types";
import { applyWhen } from "./apply-when";
import { alwaysFiles } from "./always-files";

export function computeFileTree(spec: ArchitextSpec, catalog: Catalog): FileTree {
  // Build group → directory rules: a group with 2+ services becomes a parent dir.
  const groupDirByGroupId = new Map<string, string>();
  for (const g of spec.groups) {
    if (g.serviceIds.length >= 2) {
      groupDirByGroupId.set(g.id, g.name);
    }
  }

  const byService: Record<string, string[]> = {};
  const allPaths = new Set<string>();

  for (const file of alwaysFiles()) {
    allPaths.add(file);
  }

  for (const service of spec.services) {
    const presentIds = new Set(service.components.map((c) => c.id));
    const groupDir = service.groupId !== undefined ? groupDirByGroupId.get(service.groupId) : undefined;
    const prefix = groupDir !== undefined ? `${groupDir}/${service.name}` : service.name;

    const servicePaths = new Set<string>();
    for (const comp of service.components) {
      const entry = catalog.byId(comp.id);
      if (entry === undefined) continue;
      for (const rule of entry.files ?? []) {
        if (applyWhen(rule, service.kind, presentIds)) {
          const fullPath = `${prefix}/${rule.path}`;
          servicePaths.add(fullPath);
          allPaths.add(fullPath);
        }
      }
    }

    byService[service.id] = [...servicePaths].sort();
  }

  if (hasAiWorkflow(spec)) {
    for (const path of langGraphFiles()) {
      allPaths.add(path);
    }
  }

  return {
    paths: [...allPaths].sort(),
    byService,
  };
}

function hasAiWorkflow(spec: ArchitextSpec): boolean {
  return (
    spec.services.some((service) =>
      ["ai-agent", "ai-model", "human-step", "decision"].includes(service.kind)
    ) || spec.edges.some((edge) => edge.protocol === "human-review" || edge.protocol === "decision")
  );
}

function langGraphFiles(): readonly string[] {
  return [
    "workflow/index.ts",
    "workflow/state.ts",
    "workflow/agents.ts",
    "workflow/models.ts",
    "workflow/tools.ts",
    "workflow/human-gates.ts",
    "workflow/decisions.ts",
  ];
}
