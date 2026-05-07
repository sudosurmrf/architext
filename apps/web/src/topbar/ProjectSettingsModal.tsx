/**
 * @module @architext/web/topbar/ProjectSettingsModal
 * Concepts: [[ProjectSettings]], [[SpecMetadata]], [[Slug]]
 * Depends on: [[spec-store]]
 * Consumed by: [[TopBar]]
 */

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useSpecStore } from "../store/spec-store";

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

export function ProjectSettingsModal({ open, onClose }: ProjectSettingsModalProps) {
  const project = useSpecStore((s) => s.spec.project);
  const updateProject = useSpecStore((s) => s.updateProject);

  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [description, setDescription] = useState(project.description ?? "");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project.name);
    setSlug(project.slug);
    setDescription(project.description ?? "");
    setSlugTouched(false);
  }, [open, project.description, project.name, project.slug]);

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
    updateProject(normalizedName, normalizedSlug, description.trim() || undefined);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-[440px] max-w-[calc(100vw-2rem)] rounded-lg bg-white p-5 shadow-xl"
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
