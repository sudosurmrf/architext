/**
 * @module @architext/web/topbar/TopBar
 * Concepts: [[TopBar]], [[ProjectName]], [[ActionButtons]]
 * Spec: §4.1 Layout — horizontal top bar with project name and action buttons
 * Depends on: [[spec-store]] (project name), [[ui-store]] (modal open/close)
 * Consumed by: [[App]] (top region)
 */

import { Layers, Download, Terminal } from "lucide-react";
import { useSpecStore } from "../store/spec-store";
import { useUIStore } from "../store/ui-store";

export function TopBar() {
  const projectName = useSpecStore((s) => s.spec.project.name);
  const setExportModalOpen = useUIStore((s) => s.setExportModalOpen);
  const setApplyModalOpen = useUIStore((s) => s.setApplyModalOpen);

  return (
    <div className="flex h-12 flex-none items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <Layers className="h-5 w-5 text-blue-600" />
        <span className="text-lg font-semibold text-gray-900">
          {projectName}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExportModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
        <button
          onClick={() => setApplyModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
        >
          <Terminal className="h-4 w-4" />
          <span>Apply...</span>
        </button>
      </div>
    </div>
  );
}
