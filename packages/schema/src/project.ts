/**
 * @module @architext/schema/project
 * Concepts: [[ProjectMeta]], [[Slug]], [[KebabCase]]
 * Spec: §3 JSON Spec Schema — ProjectMeta interface
 * Depends on: zod
 * Consumed by: [[spec]] (top-level project field), [[@architext/cli]] (target dir = project.slug)
 */

import { z } from "zod";

const SlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ProjectMetaSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(SlugRegex, {
    message: "slug must be lowercase kebab-case, e.g. my-app",
  }),
  description: z.string().optional(),
  defaultBranch: z.string().min(1).optional(),
});

export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;
