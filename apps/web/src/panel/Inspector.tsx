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
import type {
  ArchitextSpec,
  Group,
  Service,
  Edge,
  GroupKind,
  ServiceKind,
  GroupNetwork,
} from "@architext/schema";

const GROUP_KINDS: GroupKind[] = [
  "frontend",
  "backend",
  "data",
  "workers",
  "external",
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
  "sidecar",
  "external-api",
];

const NETWORK_OPTIONS: (GroupNetwork | "")[] = ["", "public", "private", "internal"];

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
  "w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";
const selectClass =
  "w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";
const labelClass = "text-xs font-medium text-gray-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
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

function withOptionalField<T extends Edge>(edge: T, key: string, value: string | number | undefined): T {
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
    <div className="space-y-2">
      <Field label="Name">
        <input
          className={inputClass}
          value={group.name}
          onChange={(e) => updateGroup({ name: e.target.value })}
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

  const updateService = (patch: Partial<Service>) => {
    const next: ArchitextSpec = {
      ...spec,
      services: spec.services.map((s) =>
        s.id === service.id ? { ...s, ...patch } : s
      ),
    };
    setSpec(next);
  };

  const handleDelete = () => {
    removeNode(service.id);
    clearSelection();
  };

  return (
    <div className="space-y-2">
      <Field label="Name">
        <input
          className={inputClass}
          value={service.name}
          onChange={(e) => updateService({ name: e.target.value })}
        />
      </Field>
      <Field label="Kind">
        <select
          className={selectClass}
          value={service.kind}
          onChange={(e) => updateService({ kind: e.target.value as ServiceKind })}
        >
          {SERVICE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Field>
      {service.components.length > 0 && (
        <div>
          <span className={labelClass}>Components</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {service.components.map((c) => (
              <span
                key={c.id}
                className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
              >
                {c.id}
              </span>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={handleDelete}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-red-200 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Service
      </button>
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

export function Inspector() {
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
    <div className="p-3 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Settings className="h-4 w-4" />
        Properties
      </h3>

      {entity.type === "group" && <GroupInspector group={entity.data} />}
      {entity.type === "service" && <ServiceInspector service={entity.data} />}
      {entity.type === "edge" && <EdgeInspector edge={entity.data} />}
    </div>
  );
}
