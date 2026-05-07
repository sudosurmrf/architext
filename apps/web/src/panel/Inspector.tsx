/**
 * @module @architext/web/panel/Inspector
 * Concepts: [[PropertyEditor]], [[Selection]], [[InlineEditing]]
 * Spec: §4.7 Selection and keyboard shortcuts — selected entity inspector
 * Depends on: [[ui-store]] (selectedIds), [[spec-store]] (spec, setSpec, removeNode, removeEdge), [[@architext/schema]] (types, enums)
 * Consumed by: [[SidePanel]] (bottom section when selection active)
 */

import { useUIStore } from "../store/ui-store";
import { useSpecStore } from "../store/spec-store";
import { Settings, Trash2 } from "lucide-react";
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
} from "@architext/schema";

const GROUP_KINDS: GroupKind[] = [
  "frontend",
  "backend",
  "data",
  "workers",
  "external",
  "infrastructure",
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
  "sidecar",
  "external-api",
];

const NETWORK_OPTIONS: (GroupNetwork | "")[] = ["", "public", "private", "internal"];
const COMPONENT_CATEGORIES: ComponentCategory[] = [
  "language",
  "runtime",
  "framework",
  "library",
  "build-tool",
  "datastore",
  "infrastructure",
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

function optionalPort(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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
    case "queue":
      return (
        <>
          <Field label="Topic">
            <input
              className={inputClass}
              value={edge.topicName}
              onChange={(e) => onChange({ ...edge, topicName: optionalText(e.target.value) ?? "default" })}
            />
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
  return next;
}

function hasContractDetails(contract: ServiceContract): boolean {
  return Boolean(contract.contentType || contract.schema || contract.notes);
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

function GroupInspector({ group }: { group: Group }) {
  const spec = useSpecStore((s) => s.spec);
  const setSpec = useSpecStore((s) => s.setSpec);
  const removeNode = useSpecStore((s) => s.removeNode);
  const clearSelection = useUIStore((s) => s.clearSelection);

  const updateGroup = (patch: Partial<Group>) => {
    const next: ArchitextSpec = {
      ...spec,
      groups: spec.groups.map((g) =>
        g.id === group.id ? { ...g, ...patch } : g
      ),
    };
    setSpec(next);
  };

  const handleDelete = () => {
    removeNode(group.id);
    clearSelection();
  };

  return (
    <div className={sectionClass}>
      <Field label="Name">
        <input
          className={inputClass}
          value={group.name}
          onChange={(e) => updateGroup({ name: e.target.value })}
        />
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
      ...patch,
    });

    const contracts = service.contracts?.filter((contract) => contract.id !== (existing?.id ?? contractId)) ?? [];
    const nextContracts = hasContractDetails(nextContract)
      ? [...contracts, nextContract]
      : contracts;
    updateService({ contracts: nextContracts.length > 0 ? nextContracts : undefined });
  };

  const handleDelete = () => {
    removeNode(service.id);
    clearSelection();
  };

  return (
    <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className={sectionClass}>
          <Field label="Name">
            <input
              className={inputClass}
              value={service.name}
              onChange={(e) => updateService({ name: e.target.value })}
            />
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
  const updateEdge = useSpecStore((s) => s.updateEdge);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const spec = useSpecStore((s) => s.spec);

  const fromService = spec.services.find((s) => s.id === edge.from);
  const toService = spec.services.find((s) => s.id === edge.to);

  const handleDelete = () => {
    removeEdge(edge.id);
    clearSelection();
  };

  return (
    <div className="space-y-2">
      <Field label="Protocol">
        <div className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
          {edge.protocol}
        </div>
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
