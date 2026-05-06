/**
 * @module @architext/web/App
 * Concepts: [[AppShell]], [[LayoutRegions]]
 * Spec: §4.1 Layout — three regions (top bar, palette + canvas, side panel)
 * Depends on: (wired in Task 28)
 * Consumed by: [[main]] (root render)
 */

export function App() {
  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50 text-gray-900">
      <div className="flex h-12 items-center border-b border-gray-200 px-4">
        <span className="text-lg font-semibold">Architext</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-14 flex-col border-r border-gray-200 bg-white">
          {/* Palette rail placeholder */}
        </div>
        <div className="flex-1 bg-gray-100">
          {/* Canvas placeholder */}
        </div>
        <div className="w-80 border-l border-gray-200 bg-white">
          {/* Side panel placeholder */}
        </div>
      </div>
    </div>
  );
}
