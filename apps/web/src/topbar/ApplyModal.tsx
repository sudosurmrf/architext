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

export interface ApplyModalProps {
  open: boolean;
  onClose: () => void;
}

const CLI_COMMAND = "npx architext apply ./architext-spec.json";

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
    await navigator.clipboard.writeText(CLI_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const jsonString = useMemo(() => JSON.stringify(spec, null, 2), [spec]);

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
        <p className="mb-4 text-sm text-gray-600">
          Run this command in your terminal to scaffold the project:
        </p>

        <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 font-mono text-sm text-green-400">
          <code className="flex-1">{CLI_COMMAND}</code>
          <button
            onClick={handleCopy}
            className="text-gray-400 transition-colors hover:text-white"
            title="Copy"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
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
