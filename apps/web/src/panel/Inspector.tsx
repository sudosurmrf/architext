/**
 * @module @architext/web/panel/Inspector
 * Concepts: [[PropertyEditor]], [[Selection]], [[InlineEditing]]
 * Spec: §4.7 Selection and keyboard shortcuts — selected entity inspector
 * Depends on: [[ui-store]] (selectedIds), [[spec-store]] (spec, setSpec, removeNode, removeEdge), [[@architext/schema]] (types, enums)
 * Consumed by: [[SidePanel]] (bottom section when selection active)
 */

import { useState } from "react";
import { useUIStore } from "../store/ui-store";
import { useSpecStore } from "../store/spec-store";
import { Settings, Trash2, Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { loadCatalog, type CatalogEntry } from "@architext/catalog";
import type {
  ArchitextSpec,
  Group,
  Service,
  Edge,
  Component,
  ComponentCategory,
  GroupKind,
  ServiceKind,
  GroupNetwork,
  ServiceContract,
  BusinessContext,
  Protocol,
} from "@architext/schema";

const GROUP_KINDS: GroupKind[] = [
  "frontend",
  "backend",
  "data",
  "workers",
  "external",
  "infrastructure",
  "ai-workflow",
  "sidecars",
  "custom",
];

const SERVICE_KINDS: ServiceKind[] = [
  "frontend-app",
  "backend-service",
  "worker",
  "database",
  "cache",
  "queue",
  "infrastructure",
  "ai-model",
  "ai-agent",
  "human-step",
  "decision",
  "sidecar",
  "external-api",
];

const NETWORK_OPTIONS: (GroupNetwork | "")[] = ["", "public", "private", "internal"];

const PROTOCOLS: Protocol[] = [
  "http", "graphql", "grpc", "websocket", "queue", "sql",
  "key-value", "fs", "event", "object-storage", "identity",
  "secret", "container-image", "lambda-invoke", "human-review",
  "decision", "dns",
];
const COMPONENT_CATEGORIES: ComponentCategory[] = [
  "language",
  "runtime",
  "framework",
  "library",
  "build-tool",
  "datastore",
  "infrastructure",
  "ai",
  "workflow",
  "auth",
  "entry-point",
];

type EntityType = "group" | "service" | "edge";
type Entity =
  | { type: "group"; data: Group }
  | { type: "service"; data: Service }
  | { type: "edge"; data: Edge };

function findEntity(spec: ArchitextSpec, id: string): Entity | null {
  const group = spec.groups.find((g) => g.id === id);
  if (group) return { type: "group", data: group };

  const service = spec.services.find((s) => s.id === id);
  if (service) return { type: "service", data: service };

  const edge = spec.edges.find((e) => e.id === id);
  if (edge) return { type: "edge", data: edge };

  return null;
}

const inputClass =
  "w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 shadow-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400";
const selectClass =
  "w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 shadow-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400";
const labelClass = "text-[11px] font-semibold text-gray-500";
const sectionClass = "rounded-lg border border-gray-200 bg-white p-3 shadow-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalList(value: string): string[] | undefined {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

function listText(value: readonly string[] | undefined): string {
  return value?.join("\n") ?? "";
}

function normalizeBusinessContext(context: BusinessContext): BusinessContext | undefined {
  const next: BusinessContext = {};
  if (context.purpose?.trim()) next.purpose = context.purpose.trim();
  if (context.businessRules && context.businessRules.length > 0) next.businessRules = context.businessRules;
  if (context.inputs && context.inputs.length > 0) next.inputs = context.inputs;
  if (context.outputs && context.outputs.length > 0) next.outputs = context.outputs;
  if (context.edgeCases && context.edgeCases.length > 0) next.edgeCases = context.edgeCases;
  if (context.acceptanceCriteria && context.acceptanceCriteria.length > 0) next.acceptanceCriteria = context.acceptanceCriteria;
  if (context.notes?.trim()) next.notes = context.notes.trim();
  return Object.keys(next).length > 0 ? next : undefined;
}

function BusinessContextEditor({
  value,
  onChange,
  title = "Business Context",
}: {
  value: BusinessContext | undefined;
  onChange: (value: BusinessContext | undefined) => void;
  title?: string;
}) {
  const filledCount = [
    value?.purpose, value?.notes,
    ...(value?.businessRules ?? []),
    ...(value?.inputs ?? []),
    ...(value?.outputs ?? []),
    ...(value?.edgeCases ?? []),
    ...(value?.acceptanceCriteria ?? []),
  ].filter(Boolean).length;

  const [open, setOpen] = useState(filledCount > 0);

  const update = (patch: Partial<BusinessContext>) => {
    onChange(normalizeBusinessContext({ ...(value ?? {}), ...patch }));
  };

  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-emerald-800">{title}</span>
        <span className="flex items-center gap-2">
          {!open && filledCount > 0 && (
            <span className="text-[11px] text-emerald-700">{filledCount} fields</span>
          )}
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-emerald-700" />
            : <ChevronRight className="h-3.5 w-3.5 text-emerald-700" />}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="mb-2 text-[11px] text-emerald-700">Optional scaffold guidance</div>
          <div className="grid gap-2 lg:grid-cols-2">
            <Field label="Purpose">
              <textarea
                className={`${inputClass} min-h-20 resize-none bg-white`}
                value={value?.purpose ?? ""}
                placeholder="What this piece exists to accomplish"
                onChange={(e) => update({ purpose: optionalText(e.target.value) })}
              />
            </Field>
            <Field label="Notes">
              <textarea
                className={`${inputClass} min-h-20 resize-none bg-white`}
                value={value?.notes ?? ""}
                placeholder="Extra implementation context for Claude"
                onChange={(e) => update({ notes: optionalText(e.target.value) })}
              />
            </Field>
            <Field label="Business rules">
              <textarea
                className={`${inputClass} min-h-24 resize-none bg-white`}
                value={listText(value?.businessRules)}
                placeholder="One rule per line"
                onChange={(e) => update({ businessRules: optionalList(e.target.value) })}
              />
            </Field>
            <Field label="Inputs">
              <textarea
                className={`${inputClass} min-h-24 resize-none bg-white`}
                value={listText(value?.inputs)}
                placeholder="One expected input per line"
                onChange={(e) => update({ inputs: optionalList(e.target.value) })}
              />
            </Field>
            <Field label="Outputs">
              <textarea
                className={`${inputClass} min-h-24 resize-none bg-white`}
                value={listText(value?.outputs)}
                placeholder="One expected output per line"
                onChange={(e) => update({ outputs: optionalList(e.target.value) })}
              />
            </Field>
            <Field label="Edge cases">
              <textarea
                className={`${inputClass} min-h-24 resize-none bg-white`}
                value={listText(value?.edgeCases)}
                placeholder="One edge case per line"
                onChange={(e) => update({ edgeCases: optionalList(e.target.value) })}
              />
            </Field>
            <div className="lg:col-span-2">
              <Field label="Acceptance criteria">
                <textarea
                  className={`${inputClass} min-h-24 resize-none bg-white`}
                  value={listText(value?.acceptanceCriteria)}
                  placeholder="One acceptance check per line"
                  onChange={(e) => update({ acceptanceCriteria: optionalList(e.target.value) })}
                />
              </Field>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function optionalPort(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function optionalBoolean(value: string): boolean | undefined {
  if (value === "") return undefined;
  return value === "true";
}

function withOptionalField<T extends Edge>(edge: T, key: string, value: unknown): T {
  const next = { ...edge } as Record<string, unknown>;
  if (value === undefined || value === "") {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next as T;
}

function EdgeConfigFields({ edge, onChange }: { edge: Edge; onChange: (edge: Edge) => void }) {
  switch (edge.protocol) {
    case "http":
      return (
        <>
          <Field label="Port">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={edge.port ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "port", optionalPort(e.target.value)))}
            />
          </Field>
          <Field label="Base path">
            <input
              className={inputClass}
              value={edge.basePath ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "basePath", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
    case "graphql":
      return (
        <>
          <Field label="Port">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={edge.port ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "port", optionalPort(e.target.value)))}
            />
          </Field>
          <Field label="Path">
            <input
              className={inputClass}
              value={edge.path ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "path", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
    case "grpc":
      return (
        <Field label="Port">
          <input
            className={inputClass}
            type="number"
            min={1}
            value={edge.port ?? ""}
            onChange={(e) => onChange(withOptionalField(edge, "port", optionalPort(e.target.value)))}
          />
        </Field>
      );
    case "websocket":
      return (
        <>
          <Field label="Port">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={edge.port ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "port", optionalPort(e.target.value)))}
            />
          </Field>
          <Field label="Path">
            <input
              className={inputClass}
              value={edge.path ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "path", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
    case "queue": {
      const topicError = !edge.topicName || edge.topicName.trim() === "" ? "Topic name is required" : null;
      return (
        <>
          <Field label="Topic">
            <input
              className={`${inputClass} ${topicError ? "border-red-400 focus:border-red-400 focus:ring-red-400" : ""}`}
              value={edge.topicName}
              onChange={(e) => onChange({ ...edge, topicName: optionalText(e.target.value) ?? "default" })}
            />
            {topicError && <p className="mt-1 text-xs text-red-500">{topicError}</p>}
          </Field>
          <Field label="Broker">
            <input
              className={inputClass}
              value={edge.broker ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "broker", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
    }
    case "sql":
      return (
        <>
          <Field label="Database">
            <input
              className={inputClass}
              value={edge.database ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "database", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Port">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={edge.port ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "port", optionalPort(e.target.value)))}
            />
          </Field>
        </>
      );
    case "key-value":
      return (
        <Field label="Namespace">
          <input
            className={inputClass}
            value={edge.namespace ?? ""}
            onChange={(e) => onChange(withOptionalField(edge, "namespace", optionalText(e.target.value)))}
          />
        </Field>
      );
    case "fs":
      return (
        <Field label="Mount path">
          <input
            className={inputClass}
            value={edge.mountPath ?? ""}
            onChange={(e) => onChange(withOptionalField(edge, "mountPath", optionalText(e.target.value)))}
          />
        </Field>
      );
    case "event":
      return (
        <>
          <Field label="Event bus">
            <input
              className={inputClass}
              value={edge.eventBus ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "eventBus", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Source">
            <input
              className={inputClass}
              value={edge.source ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "source", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Detail type">
            <input
              className={inputClass}
              value={edge.detailType ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "detailType", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
    case "object-storage":
      return (
        <>
          <Field label="Bucket">
            <input
              className={inputClass}
              value={edge.bucket ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "bucket", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Prefix">
            <input
              className={inputClass}
              value={edge.prefix ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "prefix", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
    case "identity":
      return (
        <>
          <Field label="Provider">
            <input
              className={inputClass}
              value={edge.provider ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "provider", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Scopes">
            <input
              className={inputClass}
              value={edge.scopes?.join(", ") ?? ""}
              onChange={(e) => {
                const scopes = e.target.value
                  .split(",")
                  .map((scope) => scope.trim())
                  .filter(Boolean);
                onChange(withOptionalField(edge, "scopes", scopes.length > 0 ? scopes : undefined));
              }}
            />
          </Field>
        </>
      );
    case "secret":
      return (
        <Field label="Namespace">
          <input
            className={inputClass}
            value={edge.namespace ?? ""}
            onChange={(e) => onChange(withOptionalField(edge, "namespace", optionalText(e.target.value)))}
          />
        </Field>
      );
    case "container-image":
      return (
        <>
          <Field label="Repository">
            <input
              className={inputClass}
              value={edge.repository ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "repository", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Tag">
            <input
              className={inputClass}
              value={edge.tag ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "tag", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
    case "lambda-invoke":
      return (
        <>
          <Field label="Function name">
            <input
              className={inputClass}
              value={edge.functionName ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "functionName", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Invocation type">
            <select
              className={selectClass}
              value={edge.invocationType ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "invocationType", optionalText(e.target.value)))}
            >
              <option value="">(none)</option>
              <option value="request-response">request-response</option>
              <option value="event">event</option>
            </select>
          </Field>
          <Field label="Qualifier">
            <input
              className={inputClass}
              value={edge.qualifier ?? ""}
              placeholder="alias or version"
              onChange={(e) => onChange(withOptionalField(edge, "qualifier", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Endpoint visibility">
            <select
              className={selectClass}
              value={edge.endpointVisibility ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "endpointVisibility", optionalText(e.target.value)))}
            >
              <option value="">(none)</option>
              <option value="public">public</option>
              <option value="private">private</option>
            </select>
          </Field>
          <Field label="Authorizer">
            <input
              className={inputClass}
              value={edge.authorizer ?? ""}
              placeholder="iam, cognito, jwt, custom"
              onChange={(e) => onChange(withOptionalField(edge, "authorizer", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
    case "human-review":
      return (
        <>
          <Field label="Review type">
            <select
              className={selectClass}
              value={edge.reviewType ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "reviewType", optionalText(e.target.value)))}
            >
              <option value="">(none)</option>
              <option value="approval">approval</option>
              <option value="edit">edit</option>
              <option value="evaluation">evaluation</option>
              <option value="escalation">escalation</option>
            </select>
          </Field>
          <Field label="Assignee">
            <input
              className={inputClass}
              value={edge.assignee ?? ""}
              placeholder="team, role, or user"
              onChange={(e) => onChange(withOptionalField(edge, "assignee", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="SLA">
            <input
              className={inputClass}
              value={edge.sla ?? ""}
              placeholder="4h, 1 business day"
              onChange={(e) => onChange(withOptionalField(edge, "sla", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Instructions">
            <textarea
              className={`${inputClass} min-h-20 resize-none`}
              value={edge.instructions ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "instructions", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
    case "decision":
      return (
        <>
          <Field label="Condition">
            <textarea
              className={`${inputClass} min-h-20 resize-none font-mono`}
              value={edge.condition ?? ""}
              placeholder="confidence >= 0.8"
              onChange={(e) => onChange(withOptionalField(edge, "condition", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Branch label">
            <input
              className={inputClass}
              value={edge.branchLabel ?? ""}
              placeholder="approved, fallback, high-risk"
              onChange={(e) => onChange(withOptionalField(edge, "branchLabel", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Fallback branch">
            <select
              className={selectClass}
              value={edge.fallback === undefined ? "" : String(edge.fallback)}
              onChange={(e) => onChange(withOptionalField(edge, "fallback", optionalBoolean(e.target.value)))}
            >
              <option value="">(none)</option>
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </Field>
        </>
      );
    case "dns":
      return (
        <>
          <Field label="Domain">
            <input
              className={inputClass}
              value={edge.domainName ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "domainName", optionalText(e.target.value)))}
            />
          </Field>
          <Field label="Record type">
            <input
              className={inputClass}
              value={edge.recordType ?? ""}
              onChange={(e) => onChange(withOptionalField(edge, "recordType", optionalText(e.target.value)))}
            />
          </Field>
        </>
      );
  }
}

function serviceContractId(edgeId: string, direction: ServiceContract["direction"]): string {
  return `${edgeId}-${direction}`;
}

function cleanContract(contract: ServiceContract): ServiceContract {
  const next: ServiceContract = { ...contract };
  if (next.contentType === undefined) delete next.contentType;
  if (next.schema === undefined) delete next.schema;
  if (next.notes === undefined) delete next.notes;
  if (next.businessContext === undefined) delete next.businessContext;
  return next;
}

function hasContractDetails(contract: ServiceContract): boolean {
  return Boolean(contract.contentType || contract.schema || contract.notes || contract.businessContext);
}

function componentFromCatalog(entry: CatalogEntry): Component {
  const component: Component = {
    id: entry.id,
    category: entry.category,
  };
  if (entry.defaultVersion !== undefined) component.version = entry.defaultVersion;
  if (entry.defaultConfig !== undefined) component.config = entry.defaultConfig;
  return component;
}

function integrationPatternsFromConfig(config: Record<string, unknown> | undefined): string[] {
  const value = config?.integrationPatterns;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function formatJson(value: Record<string, unknown> | undefined): string {
  return value === undefined ? "" : JSON.stringify(value, null, 2);
}

function parseOptionalJson(value: string): Record<string, unknown> | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function StandaloneContractEditor({
  contract,
  onUpdate,
  onRemove,
}: {
  contract: ServiceContract;
  onUpdate: (patch: Partial<ServiceContract>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">{contract.name}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-600"
          title="Remove contract"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-2">
        <Field label="Name">
          <input
            className={inputClass}
            value={contract.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </Field>
        <Field label="Direction">
          <select
            className={selectClass}
            value={contract.direction}
            onChange={(e) => onUpdate({ direction: e.target.value as ServiceContract["direction"] })}
          >
            <option value="inbound">inbound</option>
            <option value="outbound">outbound</option>
            <option value="internal">internal</option>
          </select>
        </Field>
        <Field label="Content type">
          <input
            className={inputClass}
            value={contract.contentType ?? ""}
            placeholder="application/json"
            onChange={(e) => onUpdate({ contentType: optionalText(e.target.value) })}
          />
        </Field>
        <Field label="Payload schema">
          <textarea
            className={`${inputClass} min-h-20 resize-none font-mono`}
            value={contract.schema ?? ""}
            placeholder='{ "id": "string" }'
            onChange={(e) => onUpdate({ schema: optionalText(e.target.value) })}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className={`${inputClass} min-h-16 resize-none`}
            value={contract.notes ?? ""}
            onChange={(e) => onUpdate({ notes: optionalText(e.target.value) })}
          />
        </Field>
        <BusinessContextEditor
          title="Contract Business Context"
          value={contract.businessContext}
          onChange={(businessContext) => onUpdate({ businessContext })}
        />
      </div>
    </div>
  );
}

function GroupInspector({ group }: { group: Group }) {
  const spec = useSpecStore((s) => s.spec);
  const setSpec = useSpecStore((s) => s.setSpec);
  const removeNode = useSpecStore((s) => s.removeNode);
  const clearSelection = useUIStore((s) => s.clearSelection);

  const updateGroup = (patch: Partial<Group>) => {
    const nextGroup: Group = { ...group, ...patch };
    if (nextGroup.description === undefined) delete nextGroup.description;
    if (nextGroup.network === undefined) delete nextGroup.network;
    if (nextGroup.businessContext === undefined) delete nextGroup.businessContext;
    const next: ArchitextSpec = {
      ...spec,
      groups: spec.groups.map((g) =>
        g.id === group.id ? nextGroup : g
      ),
    };
    setSpec(next);
  };

  const handleDelete = () => {
    removeNode(group.id);
    clearSelection();
  };

  const nameError = group.name.trim() === "" ? "Name is required" : null;

  return (
    <div className={sectionClass}>
      <Field label="Name">
        <input
          className={`${inputClass} ${nameError ? "border-red-400 focus:border-red-400 focus:ring-red-400" : ""}`}
          value={group.name}
          onChange={(e) => updateGroup({ name: e.target.value })}
        />
        {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
      </Field>
      <Field label="Description">
        <textarea
          className={`${inputClass} min-h-16 resize-none`}
          value={group.description ?? ""}
          onChange={(e) => updateGroup({ description: optionalText(e.target.value) })}
        />
      </Field>
      <Field label="Kind">
        <select
          className={selectClass}
          value={group.kind}
          onChange={(e) => updateGroup({ kind: e.target.value as GroupKind })}
        >
          {GROUP_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Network">
        <select
          className={selectClass}
          value={group.network ?? ""}
          onChange={(e) =>
            updateGroup({
              network: e.target.value === "" ? undefined : (e.target.value as GroupNetwork),
            })
          }
        >
          {NETWORK_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === "" ? "(none)" : n}
            </option>
          ))}
        </select>
      </Field>
      <BusinessContextEditor
        value={group.businessContext}
        onChange={(businessContext) => updateGroup({ businessContext })}
      />
      <button
        onClick={handleDelete}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-red-200 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Group
      </button>
    </div>
  );
}

function ServiceInspector({ service }: { service: Service }) {
  const spec = useSpecStore((s) => s.spec);
  const setSpec = useSpecStore((s) => s.setSpec);
  const removeNode = useSpecStore((s) => s.removeNode);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const catalog = loadCatalog();
  const compatibleEntries = catalog.byCompatibleServiceKind(service.kind);
  const selectedComponents = new Map(service.components.map((c) => [c.id, c]));
  const relatedEdges = spec.edges.filter((e) => e.from === service.id || e.to === service.id);

  const updateService = (patch: Partial<Service>) => {
    const nextService: Service = { ...service, ...patch };
    if (nextService.description === undefined) delete nextService.description;
    if (nextService.businessContext === undefined) delete nextService.businessContext;
    if (nextService.contracts !== undefined && nextService.contracts.length === 0) {
      delete nextService.contracts;
    }
    const next: ArchitextSpec = {
      ...spec,
      services: spec.services.map((s) =>
        s.id === service.id ? nextService : s
      ),
    };
    setSpec(next);
  };

  const updateServiceKind = (kind: ServiceKind) => {
    const compatibleIds = new Set(catalog.byCompatibleServiceKind(kind).map((entry) => entry.id));
    updateService({
      kind,
      components: service.components.filter((component) => compatibleIds.has(component.id)),
    });
  };

  const toggleComponent = (entry: CatalogEntry) => {
    if (selectedComponents.has(entry.id)) {
      updateService({
        components: service.components.filter((component) => component.id !== entry.id),
      });
      return;
    }
    updateService({
      components: [...service.components, componentFromCatalog(entry)],
    });
  };

  const updateComponent = (componentId: string, patch: Partial<Component>) => {
    updateService({
      components: service.components.map((component) => {
        if (component.id !== componentId) return component;
        const next: Component = { ...component, ...patch };
        if (next.version === undefined) delete next.version;
        if (next.config === undefined) delete next.config;
        if (next.businessContext === undefined) delete next.businessContext;
        return next;
      }),
    });
  };

  const updateContract = (
    edge: Edge,
    direction: ServiceContract["direction"],
    patch: Partial<ServiceContract>,
  ) => {
    const contractId = serviceContractId(edge.id, direction);
    const existing = service.contracts?.find(
      (contract) => contract.edgeId === edge.id && contract.direction === direction,
    );
    const nextContract = cleanContract({
      id: existing?.id ?? contractId,
      name: existing?.name ?? `${direction} ${edge.protocol}`,
      edgeId: edge.id,
      direction,
      contentType: existing?.contentType,
      schema: existing?.schema,
      notes: existing?.notes,
      businessContext: existing?.businessContext,
      ...patch,
    });

    const contracts = service.contracts?.filter((contract) => contract.id !== (existing?.id ?? contractId)) ?? [];
    const nextContracts = hasContractDetails(nextContract)
      ? [...contracts, nextContract]
      : contracts;
    updateService({ contracts: nextContracts.length > 0 ? nextContracts : undefined });
  };

  const standaloneContracts = (service.contracts ?? []).filter(
    (c) => !c.edgeId || !spec.edges.some((e) => e.id === c.edgeId)
  );

  const addStandaloneContract = () => {
    const id = crypto.randomUUID();
    updateService({
      contracts: [
        ...(service.contracts ?? []),
        { id, name: "New Contract", direction: "internal" },
      ],
    });
  };

  const removeContract = (contractId: string) => {
    updateService({
      contracts: (service.contracts ?? []).filter((c) => c.id !== contractId),
    });
  };

  const updateStandaloneContract = (contractId: string, patch: Partial<ServiceContract>) => {
    updateService({
      contracts: (service.contracts ?? []).map((c) =>
        c.id === contractId ? cleanContract({ ...c, ...patch }) : c
      ),
    });
  };

  const handleDelete = () => {
    removeNode(service.id);
    clearSelection();
  };

  const nameError = service.name.trim() === "" ? "Name is required" : null;

  return (
    <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className={sectionClass}>
          <Field label="Name">
            <input
              className={`${inputClass} ${nameError ? "border-red-400 focus:border-red-400 focus:ring-red-400" : ""}`}
              value={service.name}
              onChange={(e) => updateService({ name: e.target.value })}
            />
            {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
          </Field>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-16 resize-none`}
              value={service.description ?? ""}
              onChange={(e) => updateService({ description: optionalText(e.target.value) })}
            />
          </Field>
          <Field label="Kind">
            <select
              className={selectClass}
              value={service.kind}
              onChange={(e) => updateServiceKind(e.target.value as ServiceKind)}
            >
              {SERVICE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <button
            onClick={handleDelete}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Service
          </button>
        </div>

        <BusinessContextEditor
          value={service.businessContext}
          onChange={(businessContext) => updateService({ businessContext })}
        />

        <div className={sectionClass}>
          <div className="mb-2 text-xs font-semibold text-gray-700">Connection Contracts</div>
          {relatedEdges.length > 0 ? (
            <div className="space-y-3">
              {relatedEdges.map((edge) => {
                const direction: ServiceContract["direction"] =
                  edge.from === service.id ? "outbound" : "inbound";
                const peerId = direction === "outbound" ? edge.to : edge.from;
                const peer = spec.services.find((candidate) => candidate.id === peerId);
                const contract = service.contracts?.find(
                  (item) => item.edgeId === edge.id && item.direction === direction,
                );
                return (
                  <div key={`${edge.id}-${direction}`} className="rounded border border-gray-100 bg-gray-50 p-2">
                    <div className="mb-2 text-xs font-medium text-gray-700">
                      {direction === "outbound" ? "Sends to" : "Receives from"} {peer?.name ?? peerId} via {edge.protocol}
                    </div>
                    <div className="space-y-2">
                      <Field label="Content type">
                        <input
                          className={inputClass}
                          value={contract?.contentType ?? ""}
                          placeholder="application/json"
                          onChange={(e) =>
                            updateContract(edge, direction, { contentType: optionalText(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="Payload schema">
                        <textarea
                          className={`${inputClass} min-h-20 resize-none font-mono`}
                          value={contract?.schema ?? ""}
                          placeholder='{ "id": "string" }'
                          onChange={(e) =>
                            updateContract(edge, direction, { schema: optionalText(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="Notes">
                        <textarea
                          className={`${inputClass} min-h-16 resize-none`}
                          value={contract?.notes ?? ""}
                          onChange={(e) =>
                            updateContract(edge, direction, { notes: optionalText(e.target.value) })
                          }
                        />
                      </Field>
                      <BusinessContextEditor
                        title="Contract Business Context"
                        value={contract?.businessContext}
                        onChange={(businessContext) =>
                          updateContract(edge, direction, { businessContext })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
              No connections selected for this service yet.
            </div>
          )}
        </div>

        <div className={sectionClass}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Standalone Contracts</span>
            <button
              type="button"
              onClick={addStandaloneContract}
              className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          {standaloneContracts.length === 0 ? (
            <p className="text-xs text-gray-400">No standalone contracts. Add one to define internal or undirected API contracts.</p>
          ) : (
            <div className="space-y-2">
              {standaloneContracts.map((contract) => (
                <StandaloneContractEditor
                  key={contract.id}
                  contract={contract}
                  onUpdate={(patch) => updateStandaloneContract(contract.id, patch)}
                  onRemove={() => removeContract(contract.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${sectionClass} min-w-0`}>
        <div className="mb-2 text-xs font-semibold text-gray-700">Service Builder</div>
        <div className="space-y-3">
          {COMPONENT_CATEGORIES.map((category) => {
            const entries = compatibleEntries.filter((entry) => entry.category === category);
            if (entries.length === 0) return null;
            return (
              <div key={category}>
                <span className={labelClass}>{category}</span>
                <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {entries.map((entry) => (
                    <label
                      key={entry.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 transition-colors hover:border-blue-200 hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 flex-none rounded border-gray-300"
                        checked={selectedComponents.has(entry.id)}
                        onChange={() => toggleComponent(entry)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-800">{entry.name}</span>
                        <span className="block leading-4 text-gray-500">{entry.description}</span>
                        {integrationPatternsFromConfig(entry.defaultConfig).length > 0 && (
                          <span className="mt-1 block text-[11px] font-medium text-blue-600">
                            {integrationPatternsFromConfig(entry.defaultConfig).length} integration patterns
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      {service.components.length > 0 && (
        <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-2">
          <div className="mb-2 text-xs font-semibold text-gray-700">Selected Components</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {service.components.map((component) => {
              const entry = catalog.byId(component.id);
              const patterns = integrationPatternsFromConfig(component.config ?? entry?.defaultConfig);
              return (
                <div key={component.id} className="rounded-md border border-gray-200 bg-white p-2">
                  <Field label={`${entry?.name ?? component.id} version`}>
                    <input
                      className={inputClass}
                      value={component.version ?? ""}
                      placeholder={entry?.defaultVersion ?? ""}
                      onChange={(e) =>
                        updateComponent(component.id, { version: optionalText(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Config JSON">
                    <textarea
                      className={`${inputClass} min-h-24 resize-none font-mono`}
                      value={formatJson(component.config)}
                      placeholder={formatJson(entry?.defaultConfig)}
                      onChange={(e) =>
                        updateComponent(component.id, { config: parseOptionalJson(e.target.value) })
                      }
                    />
                  </Field>
                  {patterns.length > 0 && (
                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2">
                      <div className="mb-1 text-[11px] font-semibold text-blue-700">Integration patterns</div>
                      <ul className="space-y-1 text-[11px] leading-4 text-blue-800">
                        {patterns.slice(0, 6).map((pattern) => (
                          <li key={pattern}>- {pattern}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2">
                    <BusinessContextEditor
                      title="Component Business Context"
                      value={component.businessContext}
                      onChange={(businessContext) =>
                        updateComponent(component.id, { businessContext })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function EdgeInspector({ edge }: { edge: Edge }) {
  const removeEdge = useSpecStore((s) => s.removeEdge);
  const addService = useSpecStore((s) => s.addService);
  const addEdge = useSpecStore((s) => s.addEdge);
  const updateEdge = useSpecStore((s) => s.updateEdge);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const select = useUIStore((s) => s.select);
  const spec = useSpecStore((s) => s.spec);
  const [protocolError, setProtocolError] = useState<string | null>(null);

  const handleProtocolChange = (newProtocol: Protocol) => {
    setProtocolError(null);
    const base = {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      ...(edge.businessContext !== undefined ? { businessContext: edge.businessContext } : {}),
    };
    const nextEdge: Edge = newProtocol === "queue"
      ? { ...base, protocol: "queue", topicName: "default" }
      : { ...base, protocol: newProtocol } as Edge;
    try {
      updateEdge(edge.id, nextEdge);
    } catch (err) {
      setProtocolError(err instanceof Error ? err.message : "Protocol change failed");
    }
  };

  const fromService = spec.services.find((s) => s.id === edge.from);
  const toService = spec.services.find((s) => s.id === edge.to);

  const midpoint = {
    x: ((fromService?.position?.x ?? 0) + (toService?.position?.x ?? 320)) / 2,
    y: ((fromService?.position?.y ?? 0) + (toService?.position?.y ?? 160)) / 2,
  };

  const cloneEdgeBetween = (from: string, to: string, suffix: string): Edge =>
    ({
      ...edge,
      id: `${edge.id}-${suffix}-${crypto.randomUUID()}`,
      from,
      to,
    }) as Edge;

  const handleDelete = () => {
    removeEdge(edge.id);
    clearSelection();
  };

  const insertHumanApproval = () => {
    const id = crypto.randomUUID();
    addService({
      id,
      name: "Human Approval",
      kind: "human-step",
      description: "Manual approval gate inserted between connected workflow steps.",
      position: midpoint,
      components: [
        {
          id: "human-approval-step",
          category: "workflow",
          config: {
            reviewType: "approval",
            instructions: "Review the payload and approve before forwarding.",
          },
        },
      ],
    });
    removeEdge(edge.id);
    addEdge(cloneEdgeBetween(edge.from, id, "to-human"));
    addEdge(cloneEdgeBetween(id, edge.to, "from-human"));
    select(id);
  };

  const insertDecisionRouter = () => {
    const id = crypto.randomUUID();
    addService({
      id,
      name: "Decision Router",
      kind: "decision",
      description: "Branching step inserted between connected workflow steps.",
      position: midpoint,
      components: [
        {
          id: "decision-router",
          category: "workflow",
          config: {
            routingMode: "rules",
            defaultCondition: "confidence >= 0.8",
          },
        },
      ],
    });
    removeEdge(edge.id);
    addEdge(cloneEdgeBetween(edge.from, id, "to-decision"));
    addEdge({
      id: `${edge.id}-decision-${crypto.randomUUID()}`,
      from: id,
      to: edge.to,
      protocol: "decision",
      condition: "confidence >= 0.8",
      branchLabel: "approved",
    });
    select(id);
  };

  return (
    <div className="space-y-2">
      <Field label="Protocol">
        <select
          className={selectClass}
          value={edge.protocol}
          onChange={(e) => handleProtocolChange(e.target.value as Protocol)}
        >
          {PROTOCOLS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {protocolError && (
          <p className="mt-1 text-xs text-red-500">{protocolError}</p>
        )}
      </Field>
      <Field label="From">
        <div className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
          {fromService?.name ?? edge.from}
        </div>
      </Field>
      <Field label="To">
        <div className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
          {toService?.name ?? edge.to}
        </div>
      </Field>
      <EdgeConfigFields edge={edge} onChange={(nextEdge) => updateEdge(edge.id, nextEdge)} />
      <BusinessContextEditor
        value={edge.businessContext}
        onChange={(businessContext) =>
          updateEdge(edge.id, withOptionalField(edge, "businessContext", businessContext))
        }
      />
      <div className="rounded-md border border-indigo-100 bg-indigo-50 p-2">
        <div className="mb-2 text-xs font-semibold text-indigo-700">Workflow inserts</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={insertHumanApproval}
            className="rounded-md border border-rose-200 bg-white px-2 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
          >
            Insert Human Approval
          </button>
          <button
            type="button"
            onClick={insertDecisionRouter}
            className="rounded-md border border-indigo-200 bg-white px-2 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
          >
            Insert Decision Router
          </button>
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-red-200 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Edge
      </button>
    </div>
  );
}

export interface InspectorProps {
  compactHeader?: boolean;
}

export function Inspector({ compactHeader = false }: InspectorProps = {}) {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const spec = useSpecStore((s) => s.spec);

  if (selectedIds.size === 0) {
    return (
      <div className="p-3 text-sm text-gray-500">
        Select a node or edge to inspect
      </div>
    );
  }

  const firstId = selectedIds.values().next().value as string;
  const entity = findEntity(spec, firstId);

  if (!entity) {
    return (
      <div className="p-3 text-sm text-gray-500">
        Selected element not found
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {!compactHeader && (
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Properties
        </h3>
      )}

      {entity.type === "group" && <GroupInspector group={entity.data} />}
      {entity.type === "service" && <ServiceInspector service={entity.data} />}
      {entity.type === "edge" && <EdgeInspector edge={entity.data} />}
    </div>
  );
}
