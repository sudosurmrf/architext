/**
 * @module @architext/web/panel/CodeTab
 * Concepts: [[CodePreview]], [[OnDemand]], [[AgentCall]]
 * Spec: §4.6 Side panel — Code tab (on-demand button per service, shows estimated tokens)
 * Depends on: [[spec-store]] (spec.services)
 * Consumed by: [[SidePanel]] (tab content)
 */

import { useSpecStore } from "../store/spec-store";

export function CodeTab() {
  const services = useSpecStore((s) => s.spec.services);

  if (services.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Add services to preview code generation.
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Code Preview</h3>
      {services.map((svc) => (
        <div
          key={svc.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
        >
          <span className="text-sm text-gray-700">{svc.name}</span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
            coming soon
          </span>
        </div>
      ))}
      <p className="mt-3 text-xs text-gray-400">
        Code preview coming in v1.5
      </p>
    </div>
  );
}
