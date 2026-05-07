/**
 * @module @architext/web/panel/SidePanel
 * Concepts: [[TabSwitcher]], [[PanelLayout]], [[Inspector]]
 * Spec: §4.6 Side panel — three tabs (Spec, Files, Code) with inspector at bottom
 * Depends on: [[ui-store]] (panelTab, setPanelTab, selectedIds), [[SpecTab]], [[FilesTab]], [[CodeTab]], [[Inspector]]
 * Consumed by: [[App]] (main layout right column)
 */

import { useUIStore, type PanelTab } from "../store/ui-store";
import { SpecTab } from "./SpecTab";
import { FilesTab } from "./FilesTab";
import { CodeTab } from "./CodeTab";

const tabs: { id: PanelTab; label: string }[] = [
  { id: "spec", label: "Spec" },
  { id: "files", label: "Files" },
  { id: "code", label: "Code" },
];

export function SidePanel() {
  const panelTab = useUIStore((s) => s.panelTab);
  const setPanelTab = useUIStore((s) => s.setPanelTab);

  return (
    <div className="flex h-full w-80 flex-col border-l border-gray-200 bg-white">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPanelTab(tab.id)}
            className={
              "flex-1 py-2 text-sm font-medium transition-colors " +
              (panelTab === tab.id
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {panelTab === "spec" && <SpecTab />}
        {panelTab === "files" && <FilesTab />}
        {panelTab === "code" && <CodeTab />}
      </div>
    </div>
  );
}
