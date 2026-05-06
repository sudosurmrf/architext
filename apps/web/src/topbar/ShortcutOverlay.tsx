/**
 * @module @architext/web/topbar/ShortcutOverlay
 * Concepts: [[ShortcutHelp]], [[ModalOverlay]]
 * Spec: PRD section 4.7 — "? show overlay"
 * Consumed by: [[App]]
 */

import { useEffect, useCallback } from "react";

interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: "Ctrl/Cmd + Z", description: "Undo" },
  { keys: "Shift + Ctrl/Cmd + Z", description: "Redo" },
  { keys: "Ctrl/Cmd + S", description: "Export / Download" },
  { keys: "Ctrl/Cmd + D", description: "Duplicate selected" },
  { keys: "Delete / Backspace", description: "Remove selected" },
  { keys: "Escape", description: "Close palette / Deselect" },
  { keys: "?", description: "Show this help" },
];

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Keyboard Shortcuts
        </h2>
        <table className="w-full">
          <tbody>
            {shortcuts.map((s) => (
              <tr key={s.keys} className="border-t border-gray-100">
                <td className="py-2 pr-4">
                  <kbd className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm text-gray-700">
                    {s.keys}
                  </kbd>
                </td>
                <td className="py-2 text-sm text-gray-600">
                  {s.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-gray-400">
          Press Escape or click outside to close
        </p>
      </div>
    </div>
  );
}
