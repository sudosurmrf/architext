/**
 * @module @architext/cli/prompt/build
 * Concepts: [[PromptAssembly]], [[FullPrompt]]
 * Spec: §5.2 step 5 — final prompt = meta-prompt + spec + optional instructions
 * Depends on: [[@architext/schema]] (ArchitextSpec)
 * Consumed by: [[commands/apply]]
 */

import type { ArchitextSpec } from "@architext/schema";
import {
  formatScaffoldContract,
  type ScaffoldContract,
} from "../contract";

export function buildPrompt(
  meta: string,
  spec: ArchitextSpec,
  instructions?: string,
  contract?: ScaffoldContract
): string {
  const parts: string[] = [meta];

  if (contract !== undefined) {
    parts.push("");
    parts.push(formatScaffoldContract(spec, contract));
  }

  if (instructions !== undefined && instructions.trim().length > 0) {
    parts.push("");
    parts.push("## Additional Instructions");
    parts.push("");
    parts.push(instructions.trim());
  }

  parts.push("");
  parts.push("```json");
  parts.push(JSON.stringify(spec, null, 2));
  parts.push("```");

  return parts.join("\n");
}
