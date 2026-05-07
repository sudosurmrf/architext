/**
 * @module @architext/web/panel/PropertiesDrawer
 * Concepts: [[BottomDrawer]], [[Inspector]], [[SelectionWorkbench]]
 * Depends on: [[ui-store]], [[Inspector]]
 * Consumed by: [[App]]
 */

import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { useUIStore } from "../store/ui-store";
import { Inspector } from "./Inspector";

export function PropertiesDrawer() {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const propertiesOpen = useUIStore((s) => s.propertiesOpen);
  const toggleProperties = useUIStore((s) => s.toggleProperties);
  const hasSelection = selectedIds.size > 0;

  return (
    <div
      className={
        "pointer-events-none absolute bottom-3 left-1/2 z-30 w-[60vw] min-w-[640px] max-w-[1200px] -translate-x-1/2 transition-transform duration-200 ease-out max-md:w-[calc(100vw-2rem)] max-md:min-w-0 " +
        (hasSelection ? "translate-y-0" : "translate-y-[calc(100%-3rem)]")
      }
    >
      <div
        className={
          "pointer-events-auto overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl transition-[height] duration-200 ease-out " +
          (propertiesOpen && hasSelection ? "h-[40vh]" : "h-12")
        }
      >
        <button
          type="button"
          onClick={toggleProperties}
          disabled={!hasSelection}
          className="flex h-12 w-full items-center justify-between border-b border-gray-200 bg-gray-50 px-4 text-left transition-colors hover:bg-gray-100 disabled:cursor-default disabled:text-gray-400 disabled:hover:bg-gray-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900">
                Properties
              </span>
              <span className="block truncate text-xs text-gray-500">
                {hasSelection ? `${selectedIds.size} selected` : "Select a node or edge"}
              </span>
            </span>
          </span>
          {propertiesOpen && hasSelection ? (
            <ChevronDown className="h-4 w-4 flex-none text-gray-500" />
          ) : (
            <ChevronUp className="h-4 w-4 flex-none text-gray-500" />
          )}
        </button>

        <div className="h-[calc(40vh-3rem)] overflow-y-auto bg-white">
          {hasSelection && <Inspector compactHeader />}
        </div>
      </div>
    </div>
  );
}
