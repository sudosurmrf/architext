import type { ArchitextSpec } from "@architext/schema";
import type { ConstraintDiagnostic } from "../types";
import { compileWorkflowManifest } from "../compile";
import { validateWorkflowManifest } from "../validate";

export const manifestCompletenessRule = (spec: ArchitextSpec): ConstraintDiagnostic[] => {
  const manifest = compileWorkflowManifest(spec);
  return validateWorkflowManifest(manifest);
};
