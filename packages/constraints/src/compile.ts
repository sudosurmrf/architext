/**
 * @module @architext/constraints/compile
 * Concepts: [[CompileWorkflowManifest]], [[Determinism]], [[RuntimeHints]]
 * Depends on: [[@architext/schema]], [[@architext/files-engine]], [[@architext/catalog]]
 * Consumed by: [[index]], [[@architext/cli]], [[@architext/web]]
 */

import type { ArchitextSpec, Component, Edge, Service } from "@architext/schema";
import { loadCatalog } from "@architext/catalog";
import { computeFileTree } from "@architext/files-engine";
import {
  WORKFLOW_MANIFEST_VERSION,
  type ArchitextWorkflowManifest,
  type WorkflowAgent,
  type WorkflowContract,
  type WorkflowDecision,
  type WorkflowHumanGate,
  type WorkflowManifestOptions,
  type WorkflowModel,
  type WorkflowNode,
  type WorkflowRuntime,
  type WorkflowRuntimeHints,
  type WorkflowTool,
} from "./types";

const LANGGRAPH_FILES = [
  "workflow/index.ts",
  "workflow/state.ts",
  "workflow/agents.ts",
  "workflow/models.ts",
  "workflow/tools.ts",
  "workflow/human-gates.ts",
  "workflow/decisions.ts",
] as const;

export function compileWorkflowManifest(
  spec: ArchitextSpec,
  options: WorkflowManifestOptions = {}
): ArchitextWorkflowManifest {
  const servicesById = new Map(spec.services.map((service) => [service.id, service]));
  const contracts = compileContracts(spec);
  const contractIdsByEdge = groupContractsByEdge(contracts);
  const nodes = spec.services.map((service) => compileNode(service, contracts));
  const humanGates = compileHumanGates(spec.edges, servicesById);
  const decisions = compileDecisions(spec.edges, servicesById);
  const models = spec.services.filter((service) => service.kind === "ai-model").map(compileModel);
  const tools = compileTools(spec.services);
  const agents = compileAgents(spec.services, spec.edges, models, tools);
  const runtimeHints = compileRuntimeHints(spec, options.runtime);
  const fileTree = computeFileTree(spec, loadCatalog());
  const expectedFiles = [...new Set([...fileTree.paths, "architext-workflow.json", ...runtimeHints.adapterFiles])].sort();

  return {
    manifestVersion: WORKFLOW_MANIFEST_VERSION,
    project: spec.project,
    nodes,
    edges: spec.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      protocol: edge.protocol,
      contractIds: contractIdsByEdge.get(edge.id) ?? [],
      ...(edge.businessContext ? { businessContext: edge.businessContext } : {}),
      ...(edge.protocol === "human-review" ? { humanGateId: humanGateId(edge.id) } : {}),
      ...(edge.protocol === "decision" ? { decisionId: decisionId(edge.id) } : {}),
    })),
    contracts,
    decisions,
    humanGates,
    agents,
    models,
    tools,
    runtimeHints,
    expectedFiles,
  };
}

function compileNode(service: Service, contracts: readonly WorkflowContract[]): WorkflowNode {
  const componentContexts = service.components
    .filter((component) => component.businessContext)
    .map((component) => ({
      id: component.id,
      category: component.category,
      businessContext: component.businessContext,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    id: service.id,
    name: service.name,
    kind: service.kind,
    ...(service.description ? { description: service.description } : {}),
    ...(service.businessContext ? { businessContext: service.businessContext } : {}),
    componentIds: service.components.map((component) => component.id).sort(),
    ...(componentContexts.length > 0 ? { componentContexts } : {}),
    contractIds: contracts.filter((contract) => contract.serviceId === service.id).map((contract) => contract.id).sort(),
  };
}

function compileContracts(spec: ArchitextSpec): WorkflowContract[] {
  const contracts: WorkflowContract[] = [];
  for (const service of spec.services) {
    for (const contract of service.contracts ?? []) {
      contracts.push({
        id: contract.id,
        serviceId: service.id,
        ...(contract.edgeId ? { edgeId: contract.edgeId } : {}),
        direction: contract.direction,
        name: contract.name,
        ...(contract.contentType ? { contentType: contract.contentType } : {}),
        ...(contract.schema ? { schema: contract.schema } : {}),
        ...(contract.notes ? { notes: contract.notes } : {}),
        ...(contract.businessContext ? { businessContext: contract.businessContext } : {}),
      });
    }
  }
  return contracts.sort((a, b) => a.id.localeCompare(b.id));
}

function compileHumanGates(
  edges: readonly Edge[],
  servicesById: ReadonlyMap<string, Service>
): WorkflowHumanGate[] {
  const gates: WorkflowHumanGate[] = [];
  for (const edge of edges) {
    if (edge.protocol !== "human-review") continue;
    gates.push({
      id: humanGateId(edge.id),
      serviceId: findWorkflowService(edge.from, edge.to, servicesById, "human-step"),
      edgeId: edge.id,
      from: edge.from,
      to: edge.to,
      reviewType: edge.reviewType ?? "approval",
      ...(edge.assignee ? { assignee: edge.assignee } : {}),
      ...(edge.sla ? { sla: edge.sla } : {}),
      ...(edge.instructions ? { instructions: edge.instructions } : {}),
      ...(edge.businessContext ? { businessContext: edge.businessContext } : {}),
      outputContract: {
        approved: "boolean",
        reviewer: "string",
        comments: "string",
        reviewedAt: "iso-datetime",
      },
    });
  }
  return gates.sort((a, b) => a.id.localeCompare(b.id));
}

function compileDecisions(
  edges: readonly Edge[],
  servicesById: ReadonlyMap<string, Service>
): WorkflowDecision[] {
  const decisions: WorkflowDecision[] = [];
  for (const edge of edges) {
    if (edge.protocol !== "decision") continue;
    decisions.push({
      id: decisionId(edge.id),
      serviceId: findWorkflowService(edge.from, edge.to, servicesById, "decision"),
      edgeId: edge.id,
      from: edge.from,
      to: edge.to,
      condition: edge.condition?.trim() || "true",
      branchLabel: edge.branchLabel?.trim() || "branch",
      fallback: edge.fallback ?? false,
      ...(edge.businessContext ? { businessContext: edge.businessContext } : {}),
    });
  }
  return decisions.sort((a, b) => a.id.localeCompare(b.id));
}

function compileModel(service: Service): WorkflowModel {
  const config = mergeComponentConfig(service.components);
  return {
    id: `model:${service.id}`,
    serviceId: service.id,
    ...(typeof config.provider === "string" ? { provider: config.provider } : {}),
    ...(typeof config.model === "string" ? { model: config.model } : {}),
    ...(service.businessContext ? { businessContext: service.businessContext } : {}),
  };
}

function compileTools(services: readonly Service[]): WorkflowTool[] {
  const tools: WorkflowTool[] = [];
  for (const service of services) {
    if (service.kind === "external-api") {
      tools.push({
        id: `tool:${service.id}`,
        serviceId: service.id,
        name: service.name,
        category: "service",
        ...(service.businessContext ? { businessContext: service.businessContext } : {}),
      });
    }
    if (service.kind !== "ai-agent") continue;
    for (const component of service.components) {
      if (["entry-point", "library", "auth"].includes(component.category)) {
        tools.push({
          id: `tool:${service.id}:${component.id}`,
          serviceId: service.id,
          name: component.id,
          category: component.category,
          ...(component.businessContext ? { businessContext: component.businessContext } : {}),
        });
      }
    }
  }
  return tools.sort((a, b) => a.id.localeCompare(b.id));
}

function compileAgents(
  services: readonly Service[],
  edges: readonly Edge[],
  models: readonly WorkflowModel[],
  tools: readonly WorkflowTool[]
): WorkflowAgent[] {
  const modelServiceIds = new Set(models.map((model) => model.serviceId));
  return services
    .filter((service) => service.kind === "ai-agent")
    .map((service): WorkflowAgent => {
      const connectedIds = new Set(
        edges
          .filter((edge) => edge.from === service.id || edge.to === service.id)
          .flatMap((edge) => [edge.from, edge.to])
          .filter((id) => id !== service.id)
      );
      return {
        id: `agent:${service.id}`,
        serviceId: service.id,
        modelIds: models.filter((model) => connectedIds.has(model.serviceId) || modelServiceIds.has(model.serviceId)).map((model) => model.id).sort(),
        toolIds: tools.filter((tool) => tool.serviceId === service.id || connectedIds.has(tool.serviceId)).map((tool) => tool.id).sort(),
        ...(service.businessContext ? { businessContext: service.businessContext } : {}),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function compileRuntimeHints(
  spec: ArchitextSpec,
  requested: WorkflowRuntime | "auto" | undefined
): WorkflowRuntimeHints {
  const hasWorkflow = hasAiWorkflow(spec);
  const runtime: WorkflowRuntime =
    requested === "none" ? "none" : requested === "langgraph-ts" || hasWorkflow ? "langgraph-ts" : "none";
  return {
    runtime,
    adapterFiles: runtime === "langgraph-ts" ? [...LANGGRAPH_FILES] : [],
    reason:
      runtime === "langgraph-ts"
        ? "AI workflow nodes or runtime option require a LangGraph TypeScript scaffold."
        : "No AI workflow runtime scaffold requested.",
  };
}

function hasAiWorkflow(spec: ArchitextSpec): boolean {
  return (
    spec.services.some((service) => ["ai-agent", "ai-model", "human-step", "decision"].includes(service.kind)) ||
    spec.edges.some((edge) => edge.protocol === "human-review" || edge.protocol === "decision")
  );
}

function groupContractsByEdge(contracts: readonly WorkflowContract[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const contract of contracts) {
    if (!contract.edgeId) continue;
    const ids = map.get(contract.edgeId) ?? [];
    ids.push(contract.id);
    map.set(contract.edgeId, ids.sort());
  }
  return map;
}

function findWorkflowService(
  from: string,
  to: string,
  servicesById: ReadonlyMap<string, Service>,
  kind: Service["kind"]
): string | undefined {
  if (servicesById.get(from)?.kind === kind) return from;
  if (servicesById.get(to)?.kind === kind) return to;
  return undefined;
}

function mergeComponentConfig(components: readonly Component[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const component of components) {
    if (component.config && typeof component.config === "object") {
      Object.assign(out, component.config);
    }
  }
  return out;
}

function humanGateId(edgeId: string): string {
  return `human:${edgeId}`;
}

function decisionId(edgeId: string): string {
  return `decision:${edgeId}`;
}
