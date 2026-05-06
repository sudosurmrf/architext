/**
 * @module @architext/cli/bin
 * Concepts: [[CliEntry]], [[Shebang]]
 * Spec: §5.1 Command surface — npx architext entry
 * Depends on: [[cli]] (runCli)
 * Consumed by: end users via `npx architext`
 */

import { runCli } from "./cli";

runCli(process.argv).then((code) => process.exit(code));
