/**
 * @module @architext/catalog/data/auth
 * Concepts: [[CatalogData]], [[Auth]]
 * Spec: §7.2 v1 catalog scope — Auth: Auth.js, Clerk
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "auth-js",
    category: "auth",
    name: "Auth.js",
    description: "Open-source authentication for the web",
    tags: ["auth", "session"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service"],
    files: [
      { path: "auth.config.ts", when: { requires: ["typescript"] } },
      { path: "auth.config.js", when: { excludes: ["typescript"] } },
    ],
  },
  {
    id: "clerk",
    category: "auth",
    name: "Clerk",
    description: "Hosted authentication and user management",
    tags: ["auth", "saas", "session"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app", "backend-service"],
  },
] as const;

export const auth: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e))
);
