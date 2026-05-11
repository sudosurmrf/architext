/**
 * @module @architext/cli/contract
 * Concepts: [[ScaffoldContract]], [[ExpectedFiles]], [[PostRunVerification]]
 * Spec: Agentic workflow speed plan - deterministic file contract for Claude Code
 * Depends on: [[@architext/files-engine]], [[@architext/catalog]], node:fs
 * Consumed by: [[commands/apply]], [[prompt/build]]
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { ArchitextSpec } from "@architext/schema";
import { loadCatalog } from "@architext/catalog";
import { computeFileTree } from "@architext/files-engine";
import {
  compileWorkflowManifest,
  formatWorkflowManifest,
  validateWorkflowManifest,
  type ArchitextWorkflowManifest,
  type ConstraintDiagnostic,
  type WorkflowRuntime,
} from "@architext/constraints";

export interface ScaffoldContract {
  readonly expectedPaths: readonly string[];
  readonly byService: Readonly<Record<string, readonly string[]>>;
  readonly workflowManifest: ArchitextWorkflowManifest;
  readonly diagnostics: readonly ConstraintDiagnostic[];
}

export interface ScaffoldVerification {
  readonly expectedCount: number;
  readonly actualPaths: readonly string[];
  readonly missingPaths: readonly string[];
  readonly extraPaths: readonly string[];
  readonly devCommands: readonly string[];
}

export interface BuildScaffoldContractOptions {
  readonly workflowRuntime?: WorkflowRuntime | "auto";
}

export function buildScaffoldContract(
  spec: ArchitextSpec,
  options: BuildScaffoldContractOptions = {}
): ScaffoldContract {
  const workflowManifest = compileWorkflowManifest(spec, {
    runtime: options.workflowRuntime ?? "auto",
  });
  const tree = computeFileTree(spec, loadCatalog());
  return {
    expectedPaths: [...workflowManifest.expectedFiles].sort(),
    byService: Object.fromEntries(
      Object.entries(tree.byService).map(([serviceId, paths]) => [
        serviceId,
        [...paths].sort(),
      ])
    ),
    workflowManifest,
    diagnostics: validateWorkflowManifest(workflowManifest),
  };
}

export function formatScaffoldContract(
  spec: ArchitextSpec,
  contract: ScaffoldContract
): string {
  const serviceIds = new Set(spec.services.map((s) => s.id));
  const servicePaths = new Set(
    Object.values(contract.byService).flatMap((paths) => [...paths])
  );
  const rootPaths = contract.expectedPaths.filter((p) => !servicePaths.has(p));
  const lines: string[] = [
    "## Expected File Contract",
    "",
    "These paths are the deterministic scaffold contract compiled from the architecture.",
    "You may add extra files when useful, but do not omit any expected path.",
    "Before writing files, make your JSON plan include every expected path below.",
    "",
    `Expected file count: ${contract.expectedPaths.length}`,
  ];

  if (rootPaths.length > 0) {
    lines.push("", "### Project root", ...rootPaths.map((path) => `- ${path}`));
  }

  for (const service of spec.services) {
    const paths = contract.byService[service.id] ?? [];
    lines.push("", `### Service: ${service.name} (${service.id})`);
    if (paths.length === 0) {
      lines.push("- No service-specific files predicted.");
    } else {
      lines.push(...paths.map((path) => `- ${path}`));
    }
  }

  const orphanGroups = Object.keys(contract.byService).filter((id) => !serviceIds.has(id));
  for (const id of orphanGroups.sort()) {
    const paths = contract.byService[id] ?? [];
    lines.push("", `### Service: ${id}`, ...paths.map((path) => `- ${path}`));
  }

  lines.push(
    "",
    "## Workflow Constraint Manifest",
    "",
    "Write this exact manifest to `architext-workflow.json` at the project root.",
    "Use it as the semantic contract for agents, models, human gates, decisions, tools, and runtime wiring.",
    "",
    "```json",
    formatWorkflowManifest(contract.workflowManifest),
    "```"
  );

  return lines.join("\n");
}

export function verifyScaffoldContract(
  targetDir: string,
  contract: ScaffoldContract
): ScaffoldVerification {
  const actualPaths = listFiles(targetDir);
  const actual = new Set(actualPaths);
  const expected = new Set(contract.expectedPaths);
  const missingPaths = contract.expectedPaths.filter((path) => !actual.has(path));
  const extraPaths = actualPaths.filter((path) => !expected.has(path));

  return {
    expectedCount: contract.expectedPaths.length,
    actualPaths,
    missingPaths,
    extraPaths,
    devCommands: extractDevCommands(targetDir),
  };
}

export function formatScaffoldVerification(v: ScaffoldVerification): string {
  const lines: string[] = [];
  if (v.missingPaths.length === 0) {
    lines.push(`Scaffold contract: PASS - all ${v.expectedCount} expected files are present.`);
  } else {
    lines.push(
      `Scaffold contract: FAIL - ${v.missingPaths.length} of ${v.expectedCount} expected files are missing.`
    );
    lines.push("Missing expected files:");
    lines.push(...limitList(v.missingPaths).map((path) => `  - ${path}`));
  }

  lines.push(`Actual files written: ${v.actualPaths.length}`);
  if (v.extraPaths.length > 0) {
    lines.push(`Extra files created: ${v.extraPaths.length}`);
    lines.push(...limitList(v.extraPaths).map((path) => `  - ${path}`));
  } else {
    lines.push("Extra files created: 0");
  }

  if (v.devCommands.length > 0) {
    lines.push("Next local commands found in README:");
    lines.push(...v.devCommands.map((cmd) => `  - ${cmd}`));
  } else {
    lines.push("Next local commands found in README: none");
  }

  return lines.join("\n");
}

export function formatConstraintDiagnostics(diagnostics: readonly ConstraintDiagnostic[]): string {
  if (diagnostics.length === 0) return "Workflow constraints: PASS - no completeness gaps found.";
  const lines = [`Workflow constraints: ${diagnostics.length} completeness gap${diagnostics.length === 1 ? "" : "s"} found.`];
  for (const diagnostic of diagnostics.slice(0, 20)) {
    lines.push(`  - [${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}`);
  }
  if (diagnostics.length > 20) {
    lines.push(`  - ...and ${diagnostics.length - 20} more`);
  }
  return lines.join("\n");
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (shouldIgnoreGeneratedArtifact(name)) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile()) {
        out.push(toPosix(relative(root, full)));
      }
    }
  };
  walk(root);
  return out.sort();
}

function shouldIgnoreGeneratedArtifact(name: string): boolean {
  return new Set([
    ".git",
    ".cache",
    ".npm",
    ".pnpm-store",
    "node_modules",
    "tmpnodejsnpm-cache",
  ]).has(name);
}

function extractDevCommands(root: string): string[] {
  const readme = join(root, "README.md");
  if (!existsSync(readme)) return [];
  const text = readFileSync(readme, "utf-8");
  const commands = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine
      .trim()
      .replace(/^[-*]\s+/, "")
      .replace(/^`|`$/g, "");
    if (
      /\b(npm|pnpm|yarn|bun)\s+(run\s+)?(dev|start|preview)\b/i.test(line) ||
      /\buvicorn\b/i.test(line) ||
      /\bpython\b.*\bmanage\.py\b.*\brunserver\b/i.test(line) ||
      /\bgo\s+run\b/i.test(line) ||
      /\bcargo\s+run\b/i.test(line)
    ) {
      commands.add(line);
    }
  }
  return [...commands].slice(0, 12);
}

function limitList(paths: readonly string[], max = 20): string[] {
  if (paths.length <= max) return [...paths];
  return [...paths.slice(0, max), `...and ${paths.length - max} more`];
}

function toPosix(path: string): string {
  return path.split("\\").join("/");
}
