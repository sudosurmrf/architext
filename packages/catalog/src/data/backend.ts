/**
 * @module @architext/catalog/data/backend
 * Concepts: [[CatalogData]], [[BackendFramework]]
 * Spec: §7.2 v1 catalog scope — Backend frameworks: FastAPI, Express, NestJS, Django
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "fastapi",
    category: "framework",
    name: "FastAPI",
    description: "Modern, fast Python web framework for APIs",
    tags: ["backend", "api", "python", "async"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
    files: [{ path: "main.py" }, { path: "requirements.txt" }],
  },
  {
    id: "express",
    category: "framework",
    name: "Express",
    description: "Minimal Node.js web framework",
    tags: ["backend", "api", "node"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
    files: [
      { path: "src/index.ts", when: { requires: ["typescript"] } },
      { path: "src/index.js", when: { excludes: ["typescript"] } },
    ],
    defaultVersion: "^4.19.0",
  },
  {
    id: "nestjs",
    category: "framework",
    name: "NestJS",
    description: "Progressive Node.js framework with DI and decorators",
    tags: ["backend", "api", "node", "typescript"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
    files: [
      { path: "src/main.ts" },
      { path: "src/app.module.ts" },
      { path: "src/app.controller.ts" },
      { path: "nest-cli.json" },
    ],
    defaultVersion: "^10.0.0",
  },
  {
    id: "django",
    category: "framework",
    name: "Django",
    description: "Batteries-included Python web framework",
    tags: ["backend", "api", "python", "orm"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
    files: [{ path: "manage.py" }, { path: "requirements.txt" }],
  },
] as const;

export const backend: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
