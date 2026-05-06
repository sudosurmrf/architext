/**
 * @module @architext/cli/index
 * Concepts: [[CliPublicAPI]], [[Barrel]], [[ProgrammaticAPI]]
 * Spec: §5 CLI & Agent Handoff — exported for embedding & tests
 * Depends on: [[cli]], [[errors]], [[agent/backend]]
 * Consumed by: tests, future programmatic consumers
 */

export * from "./errors";
export * from "./prompt/load";
export * from "./prompt/build";
