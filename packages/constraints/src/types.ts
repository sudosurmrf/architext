/**
 * @module @architext/constraints/types
 * Concepts: [[WorkflowManifest]], [[ConstraintDiagnostic]]
 * Depends on: [[@architext/schema]]
 * Consumed by: [[compile]], [[format]], [[validate]]
 */

import type { BusinessContext, ComponentCategory, Edge, ProjectMeta, ServiceKind } from "@architext/schema";

export const WORKFLOW_MANIFEST_VERSION = "0.1.0" as const;

export type WorkflowRuntime = "none" | "langgraph-ts";

export interface WorkflowManifestOptions {
  readonly runtime?: WorkflowRuntime | "auto";
}

export interface WorkflowNode {
  readonly id: string;
  readonly name: string;
  readonly kind: ServiceKind;
  readonly description?: string;
  readonly businessContext?: BusinessContext;
  readonly componentContexts?: readonly WorkflowComponentContext[];
  readonly componentIds: readonly string[];
  readonly contractIds: readonly string[];
}

export interface WorkflowComponentContext {
  readonly id: string;
  readonly category: ComponentCategory;
  readonly businessContext?: BusinessContext;
}

export interface WorkflowEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly protocol: Edge["protocol"];
  readonly businessContext?: BusinessContext;
  readonly contractIds: readonly string[];
  readonly humanGateId?: string;
  readonly decisionId?: string;
}

export interface WorkflowContract {
  readonly id: string;
  readonly serviceId: string;
  readonly edgeId?: string;
  readonly direction: "inbound" | "outbound" | "internal";
  readonly name: string;
  readonly contentType?: string;
  readonly schema?: string;
  readonly notes?: string;
  readonly businessContext?: BusinessContext;
}

export interface WorkflowDecision {
  readonly id: string;
  readonly serviceId?: string;
  readonly edgeId?: string;
  readonly from: string;
  readonly to: string;
  readonly condition: string;
  readonly branchLabel: string;
  readonly fallback: boolean;
  readonly businessContext?: BusinessContext;
}

export interface WorkflowHumanGate {
  readonly id: string;
  readonly serviceId?: string;
  readonly edgeId?: string;
  readonly from: string;
  readonly to: string;
  readonly reviewType: "approval" | "edit" | "evaluation" | "escalation";
  readonly assignee?: string;
  readonly sla?: string;
  readonly instructions?: string;
  readonly businessContext?: BusinessContext;
  readonly outputContract: {
    readonly approved: "boolean";
    readonly reviewer: "string";
    readonly comments: "string";
    readonly reviewedAt: "iso-datetime";
  };
}

export interface WorkflowAgent {
  readonly id: string;
  readonly serviceId: string;
  readonly modelIds: readonly string[];
  readonly toolIds: readonly string[];
  readonly businessContext?: BusinessContext;
}

export interface WorkflowModel {
  readonly id: string;
  readonly serviceId: string;
  readonly provider?: string;
  readonly model?: string;
  readonly businessContext?: BusinessContext;
}

export interface WorkflowTool {
  readonly id: string;
  readonly serviceId: string;
  readonly name: string;
  readonly category: ComponentCategory | "service";
  readonly businessContext?: BusinessContext;
}

export interface WorkflowRuntimeHints {
  readonly runtime: WorkflowRuntime;
  readonly adapterFiles: readonly string[];
  readonly reason: string;
}

export interface ArchitextWorkflowManifest {
  readonly manifestVersion: typeof WORKFLOW_MANIFEST_VERSION;
  readonly project: ProjectMeta;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
  readonly contracts: readonly WorkflowContract[];
  readonly decisions: readonly WorkflowDecision[];
  readonly humanGates: readonly WorkflowHumanGate[];
  readonly agents: readonly WorkflowAgent[];
  readonly models: readonly WorkflowModel[];
  readonly tools: readonly WorkflowTool[];
  readonly runtimeHints: WorkflowRuntimeHints;
  readonly expectedFiles: readonly string[];
}

export interface DiagnosticLocation {
  readonly serviceId?: string;
  readonly edgeId?: string;
  readonly groupId?: string;
  readonly componentId?: string;
}

export interface ConstraintDiagnostic {
  readonly severity: "error" | "warning" | "info";
  readonly code: string;
  readonly message: string;
  readonly location?: DiagnosticLocation;
  readonly suggestion?: string;
  /** @deprecated Use `location` instead */
  readonly path?: string;
}
