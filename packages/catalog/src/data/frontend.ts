/**
 * @module @architext/catalog/data/frontend
 * Concepts: [[CatalogData]], [[FrontendFramework]], [[Library]]
 * Spec: §7.2 v1 catalog scope — Frontend frameworks: React, Vue, Svelte, Next.js
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "react",
    category: "library",
    name: "React",
    description: "Component-based UI library",
    tags: ["frontend", "ui", "spa"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [
      { path: "src/main.tsx", when: { requires: ["typescript"] } },
      { path: "src/main.jsx", when: { excludes: ["typescript"] } },
      { path: "src/App.tsx", when: { requires: ["typescript"] } },
      { path: "src/App.jsx", when: { excludes: ["typescript"] } },
      { path: "index.html" },
    ],
    defaultVersion: "^18.3.0",
  },
  {
    id: "vue",
    category: "library",
    name: "Vue",
    description: "Progressive framework for building UIs",
    tags: ["frontend", "ui", "spa"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [
      { path: "src/main.ts", when: { requires: ["typescript"] } },
      { path: "src/main.js", when: { excludes: ["typescript"] } },
      { path: "src/App.vue" },
      { path: "index.html" },
    ],
    defaultVersion: "^3.4.0",
  },
  {
    id: "svelte",
    category: "library",
    name: "Svelte",
    description: "Cybernetically enhanced web apps",
    tags: ["frontend", "ui", "compiled"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [
      { path: "src/main.ts", when: { requires: ["typescript"] } },
      { path: "src/main.js", when: { excludes: ["typescript"] } },
      { path: "src/App.svelte" },
      { path: "index.html" },
      { path: "svelte.config.js" },
    ],
    defaultVersion: "^4.2.0",
  },
  {
    id: "next",
    category: "framework",
    name: "Next.js",
    description: "React framework for production",
    tags: ["frontend", "fullstack", "ssr"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
    files: [
      { path: "next.config.js" },
      { path: "app/layout.tsx", when: { requires: ["typescript"] } },
      { path: "app/page.tsx", when: { requires: ["typescript"] } },
      { path: "app/layout.jsx", when: { excludes: ["typescript"] } },
      { path: "app/page.jsx", when: { excludes: ["typescript"] } },
    ],
    defaultVersion: "^14.0.0",
  },
] as const;

export const frontend: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
