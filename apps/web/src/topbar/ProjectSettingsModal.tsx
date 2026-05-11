/**
 * @module @architext/web/topbar/ProjectSettingsModal
 * Concepts: [[ProjectSettings]], [[SpecMetadata]], [[Slug]]
 * Depends on: [[spec-store]]
 * Consumed by: [[TopBar]]
 */

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useSpecStore } from "../store/spec-store";
import type { BusinessContext } from "@architext/schema";

export interface ProjectSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function slugifyProjectName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

const inputClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";
const labelClass = "text-xs font-medium text-gray-500";

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalList(value: string): string[] | undefined {
  const values = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function listText(value: readonly string[] | undefined): string {
  return value?.join("\n") ?? "";
}

function normalizeBusinessContext(context: BusinessContext): BusinessContext | undefined {
  const next: BusinessContext = {};
  if (context.purpose?.trim()) next.purpose = context.purpose.trim();
  if (context.businessRules?.length) next.businessRules = context.businessRules;
  if (context.inputs?.length) next.inputs = context.inputs;
  if (context.outputs?.length) next.outputs = context.outputs;
  if (context.edgeCases?.length) next.edgeCases = context.edgeCases;
  if (context.acceptanceCriteria?.length) next.acceptanceCriteria = context.acceptanceCriteria;
  if (context.notes?.trim()) next.notes = context.notes.trim();
  return Object.keys(next).length > 0 ? next : undefined;
}

export function ProjectSettingsModal({ open, onClose }: ProjectSettingsModalProps) {
  const project = useSpecStore((s) => s.spec.project);
  const updateProject = useSpecStore((s) => s.updateProject);

  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [description, setDescription] = useState(project.description ?? "");
  const [businessContext, setBusinessContext] = useState<BusinessContext | undefined>(project.businessContext);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project.name);
    setSlug(project.slug);
    setDescription(project.description ?? "");
    setBusinessContext(project.businessContext);
    setSlugTouched(false);
  }, [open, project.businessContext, project.description, project.name, project.slug]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const normalizedSlug = useMemo(() => slugifyProjectName(slug), [slug]);
  const normalizedName = name.trim() || "Untitled";

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugifyProjectName(value));
    }
  };

  const handleSave = () => {
    updateProject(normalizedName, normalizedSlug, description.trim() || undefined, businessContext);
    onClose();
  };

  const updateBusinessContext = (patch: Partial<BusinessContext>) => {
    setBusinessContext(normalizeBusinessContext({ ...(businessContext ?? {}), ...patch }));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-2rem)] w-[560px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Project Settings</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close project settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className={labelClass}>Name</span>
            <input className={inputClass} value={name} onChange={(e) => handleNameChange(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Slug</span>
            <input
              className={inputClass}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              onBlur={() => setSlug(normalizedSlug)}
            />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Description</span>
            <textarea
              className={`${inputClass} min-h-20 resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="mb-2 text-xs font-semibold text-emerald-800">Business Context</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className={labelClass}>Purpose</span>
                <textarea
                  className={`${inputClass} min-h-20 resize-none`}
                  value={businessContext?.purpose ?? ""}
                  onChange={(e) => updateBusinessContext({ purpose: optionalText(e.target.value) })}
                />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Notes</span>
                <textarea
                  className={`${inputClass} min-h-20 resize-none`}
                  value={businessContext?.notes ?? ""}
                  onChange={(e) => updateBusinessContext({ notes: optionalText(e.target.value) })}
                />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Business rules</span>
                <textarea
                  className={`${inputClass} min-h-20 resize-none`}
                  value={listText(businessContext?.businessRules)}
                  placeholder="One per line"
                  onChange={(e) => updateBusinessContext({ businessRules: optionalList(e.target.value) })}
                />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Inputs</span>
                <textarea
                  className={`${inputClass} min-h-20 resize-none`}
                  value={listText(businessContext?.inputs)}
                  placeholder="One per line"
                  onChange={(e) => updateBusinessContext({ inputs: optionalList(e.target.value) })}
                />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Outputs</span>
                <textarea
                  className={`${inputClass} min-h-20 resize-none`}
                  value={listText(businessContext?.outputs)}
                  placeholder="One per line"
                  onChange={(e) => updateBusinessContext({ outputs: optionalList(e.target.value) })}
                />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Edge cases</span>
                <textarea
                  className={`${inputClass} min-h-20 resize-none`}
                  value={listText(businessContext?.edgeCases)}
                  placeholder="One per line"
                  onChange={(e) => updateBusinessContext({ edgeCases: optionalList(e.target.value) })}
                />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Acceptance criteria</span>
                <textarea
                  className={`${inputClass} min-h-20 resize-none`}
                  value={listText(businessContext?.acceptanceCriteria)}
                  placeholder="One per line"
                  onChange={(e) => updateBusinessContext({ acceptanceCriteria: optionalList(e.target.value) })}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
