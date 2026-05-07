/**
 * @module @architext/web/topbar/TopBar
 * Concepts: [[TopBar]], [[ProjectName]], [[ActionButtons]]
 * Spec: §4.1 Layout — horizontal top bar with project name and action buttons
 * Depends on: [[spec-store]] (project name), [[ui-store]] (modal open/close)
 * Consumed by: [[App]] (top region)
 */

import { useState } from "react";
import { Layers, Download, Pencil, RotateCcw, Terminal } from "lucide-react";
import { useSpecStore } from "../store/spec-store";
import { useUIStore } from "../store/ui-store";
import { ProjectSettingsModal } from "./ProjectSettingsModal";

export interface TopBarProps {
  onResetDesign: () => void;
}

export function TopBar({ onResetDesign }: TopBarProps) {
  const project = useSpecStore((s) => s.spec.project);
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const setExportModalOpen = useUIStore((s) => s.setExportModalOpen);
  const setApplyModalOpen = useUIStore((s) => s.setApplyModalOpen);

  return (
    <>
      <div className="flex h-12 flex-none items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Layers className="h-5 w-5 flex-none text-blue-600" />
          <button
            onClick={() => setProjectSettingsOpen(true)}
            className="group flex min-w-0 items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-gray-50"
          >
            <span className="min-w-0">
              <span className="block truncate text-lg font-semibold leading-5 text-gray-900">
                {project.name}
              </span>
              <span className="block truncate text-xs leading-4 text-gray-500">
                {project.slug}
              </span>
            </span>
            <Pencil className="h-3.5 w-3.5 flex-none text-gray-400 group-hover:text-gray-700" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResetDesign}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
            title="Reset design"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
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
      <ProjectSettingsModal open={projectSettingsOpen} onClose={() => setProjectSettingsOpen(false)} />
    </>
  );
}
