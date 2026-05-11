/**
 * @module @architext/web/topbar/ApplyModal
 * Concepts: [[ApplyModal]], [[CLICommand]], [[CopyClipboard]], [[SpecDownload]]
 * Spec: §5.7 Apply — show CLI command, copy to clipboard, download spec
 * Depends on: [[spec-store]] (spec)
 * Consumed by: [[App]] (rendered at root level)
 */

import { useCallback, useEffect, useState, useMemo } from "react";
import { Check, Copy } from "lucide-react";
import { useSpecStore } from "../store/spec-store";
import { prepareForExport } from "../lib/export-spec";
import { computeFileTree } from "@architext/files-engine";
import { loadCatalog } from "@architext/catalog";
import { buildWorkflowContractPreview } from "../lib/workflow-contract";

export interface ApplyModalProps {
  open: boolean;
  onClose: () => void;
}

const GIT_BASH_APPLY_COMMAND = "architext-create";
const GIT_BASH_FORCE_COMMAND = "architext-create --force";
const GIT_BASH_DRY_RUN_COMMAND = "architext-create --dry-run";
const WINDOWS_APPLY_COMMAND = "architext-create";
const WINDOWS_FORCE_COMMAND = "architext-create --force";

export function ApplyModal({ open, onClose }: ApplyModalProps) {
  const spec = useSpecStore((s) => s.spec);
  const [copied, setCopied] = useState(false);

  // Reset copied state when modal opens/closes
  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(GIT_BASH_APPLY_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const exportedSpec = useMemo(() => prepareForExport(spec), [spec]);
  const jsonString = useMemo(() => JSON.stringify(exportedSpec, null, 2), [exportedSpec]);
  const predictedFileCount = useMemo(
    () => computeFileTree(exportedSpec, loadCatalog()).paths.length,
    [exportedSpec],
  );
  const workflowPreview = useMemo(() => buildWorkflowContractPreview(spec), [spec]);

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
        className="w-[480px] rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold">Apply with CLI</h2>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
            <div className="font-semibold text-gray-800">{exportedSpec.services.length}</div>
            <div className="text-gray-500">services</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
            <div className="font-semibold text-gray-800">{exportedSpec.edges.length}</div>
            <div className="text-gray-500">edges</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
            <div className="font-semibold text-gray-800">{predictedFileCount}</div>
            <div className="text-gray-500">files</div>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-2">
            <div className="font-semibold text-indigo-900">{workflowPreview.manifest.nodes.length}</div>
            <div className="text-indigo-700">workflow</div>
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-2">
            <div className="font-semibold text-indigo-900">{workflowPreview.manifest.decisions.length}</div>
            <div className="text-indigo-700">decisions</div>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-2 py-2">
            <div className="font-semibold text-rose-900">{workflowPreview.manifest.humanGates.length}</div>
            <div className="text-rose-700">gates</div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-2">
            <div className="font-semibold text-emerald-900">{workflowPreview.completenessScore}%</div>
            <div className="text-emerald-700">complete</div>
          </div>
        </div>

        <div className="mb-1 text-xs font-medium text-gray-600">Git Bash</div>
        <div className="mb-3 overflow-x-auto rounded-lg bg-gray-900 px-4 py-3 font-mono text-xs text-green-400">
          <div>{GIT_BASH_APPLY_COMMAND}</div>
          <div>{GIT_BASH_FORCE_COMMAND}</div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{GIT_BASH_DRY_RUN_COMMAND}</code>
          <button
            onClick={handleCopy}
            className="text-gray-500 transition-colors hover:text-gray-900"
            title="Copy Git Bash build and apply commands"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mb-1 text-xs font-medium text-gray-500">PowerShell / CMD</div>
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
          <div>{WINDOWS_APPLY_COMMAND}</div>
          <div>{WINDOWS_FORCE_COMMAND}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm transition-colors hover:bg-gray-50"
          >
            Download spec.json
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm text-white transition-colors hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
