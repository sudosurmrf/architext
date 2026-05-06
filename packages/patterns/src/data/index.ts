/**
 * @module @architext/patterns/data/index
 * Concepts: [[PatternsData]], [[Aggregator]]
 * Spec: §7.4 v1 patterns library — flat list of every authored pattern
 * Depends on: each [[data/*]] module
 * Consumed by: [[load]]
 */

import type { Pattern } from "../types";
import { restApiWithDb } from "./rest-api-with-db";
import { frontendBackendDb } from "./frontend-backend-db";
import { workerQueue } from "./worker-queue";
import { cachedApi } from "./cached-api";
import { microservicesSkeleton } from "./microservices-skeleton";

export const allPatterns: readonly Pattern[] = Object.freeze([
  restApiWithDb,
  frontendBackendDb,
  workerQueue,
  cachedApi,
  microservicesSkeleton,
]);
