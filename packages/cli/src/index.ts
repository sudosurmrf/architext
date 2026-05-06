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
export * from "./agent/backend";
export * from "./agent/mock";
export * from "./agent/claude-code";
export * from "./agent/select";
export * from "./status";
export * from "./commands/validate";
export * from "./commands/init";
export * from "./commands/apply";
