/**
 * @module @architext/catalog/data/index
 * Concepts: [[CatalogData]], [[Aggregator]]
 * Spec: §7.2 v1 catalog scope — flat list of every authored entry
 * Depends on: each [[data/*]] module
 * Consumed by: [[load]]
 */

import type { CatalogEntry } from "../types";
import { languages } from "./languages";
import { runtimes } from "./runtimes";
import { frontend } from "./frontend";
import { buildTools } from "./build-tools";
import { backend } from "./backend";
import { datastores } from "./datastores";
import { queues } from "./queues";
import { infrastructure } from "./infrastructure";
import { ai } from "./ai";
import { auth } from "./auth";
import { entryPoints } from "./entry-points";

export const allEntries: readonly CatalogEntry[] = Object.freeze([
  ...languages,
  ...runtimes,
  ...frontend,
  ...buildTools,
  ...backend,
  ...datastores,
  ...queues,
  ...infrastructure,
  ...ai,
  ...auth,
  ...entryPoints,
]);
