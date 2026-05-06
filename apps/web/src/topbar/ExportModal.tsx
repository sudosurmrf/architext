/**
 * @module @architext/web/topbar/ExportModal
 * Concepts: [[ExportModal]], [[SpecDownload]], [[Validation]], [[ModalOverlay]]
 * Spec: §5.7 Export — download architext-spec.json with validation
 * Depends on: [[spec-store]] (spec), [[@architext/schema]] (ArchitextSpecSchema)
 * Consumed by: [[App]] (rendered at root level)
 */

import { useCallback, useEffect, useMemo } from "react";
import { ArchitextSpecSchema } from "@architext/schema";
import { useSpecStore } from "../store/spec-store";

export interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExportModal({ open, onClose }: ExportModalProps) {
  const spec = useSpecStore((s) => s.spec);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const jsonString = useMemo(() => JSON.stringify(spec, null, 2), [spec]);

  const jsonPreview = useMemo(() => {
    const lines = jsonString.split("\n");
    if (lines.length > 20) {
      return lines.slice(0, 20).join("\n") + "\n...";
    }
    return jsonString;
  }, [jsonString]);

  const validationErrors = useMemo(() => {
    const result = ArchitextSpecSchema.safeParse(spec);
    if (result.success) return [];
    return result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
  }, [spec]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architext-spec.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [jsonString]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Export Spec</h2>

        {validationErrors.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {validationErrors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        <pre className="mb-4 max-h-60 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-xs">
          {jsonPreview}
        </pre>

        <button
          disabled={validationErrors.length > 0}
          onClick={handleDownload}
          className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Download architext-spec.json
        </button>
      </div>
    </div>
  );
}
