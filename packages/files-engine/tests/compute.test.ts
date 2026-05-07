import { describe, it, expect } from "vitest";
import { computeFileTree } from "../src/compute";
import { loadCatalog } from "@architext/catalog";
import { SCHEMA_VERSION, type ArchitextSpec } from "@architext/schema";

const catalog = loadCatalog();

const baseSpec: ArchitextSpec = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "Test", slug: "test" },
  groups: [],
  services: [],
  edges: [],
};

describe("computeFileTree", () => {
  it("emits always-files even for an empty spec", () => {
    const tree = computeFileTree(baseSpec, catalog);
    expect(tree.paths).toContain(".gitignore");
    expect(tree.paths).toContain("README.md");
    expect(tree.paths).toContain("architext-spec.json");
  });

  it("prefixes each service's files with its service name", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          position: { x: 0, y: 0 },
          components: [
            { id: "python", category: "language" },
            { id: "fastapi", category: "framework" },
          ],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("api/main.py");
    expect(tree.paths).toContain("api/requirements.txt");
    expect(tree.paths).toContain("api/pyproject.toml");
    expect(tree.byService.api).toEqual(
      expect.arrayContaining(["api/main.py", "api/pyproject.toml", "api/requirements.txt"])
    );
  });

  it("respects `requires` in file rules (e.g. tsx with typescript)", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "web",
          name: "web",
          kind: "frontend-app",
          position: { x: 0, y: 0 },
          components: [
            { id: "typescript", category: "language" },
            { id: "react", category: "library" },
          ],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("web/src/main.tsx");
    expect(tree.paths).not.toContain("web/src/main.jsx");
  });

  it("respects `excludes` in file rules (e.g. jsx without typescript)", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "web",
          name: "web",
          kind: "frontend-app",
          position: { x: 0, y: 0 },
          components: [{ id: "react", category: "library" }],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("web/src/main.jsx");
    expect(tree.paths).not.toContain("web/src/main.tsx");
  });

  it("groups services under a parent directory when group has 2+ services", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      groups: [
        {
          id: "g-be",
          name: "Backend",
          kind: "backend",
          serviceIds: ["api", "db"],
          position: { x: 0, y: 0 },
          size: { width: 400, height: 300 },
        },
      ],
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          groupId: "g-be",
          position: { x: 0, y: 0 },
          components: [{ id: "python", category: "language" }],
        },
        {
          id: "db",
          name: "db",
          kind: "database",
          groupId: "g-be",
          position: { x: 0, y: 0 },
          components: [{ id: "postgres", category: "datastore" }],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("Backend/api/pyproject.toml");
    expect(tree.paths).toContain("Backend/db/schema.sql");
  });

  it("inlines services when their group has only 1 service", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      groups: [
        {
          id: "g-be",
          name: "Backend",
          kind: "backend",
          serviceIds: ["api"],
          position: { x: 0, y: 0 },
          size: { width: 400, height: 300 },
        },
      ],
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          groupId: "g-be",
          position: { x: 0, y: 0 },
          components: [{ id: "python", category: "language" }],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("api/pyproject.toml");
    expect(tree.paths).not.toContain("Backend/api/pyproject.toml");
  });

  it("returns paths sorted and deduplicated", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "api",
          name: "api",
          kind: "backend-service",
          position: { x: 0, y: 0 },
          components: [
            { id: "python", category: "language" },
            { id: "django", category: "framework" }, // both produce requirements.txt
          ],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    const reqOccurrences = tree.paths.filter((p) => p === "api/requirements.txt").length;
    expect(reqOccurrences).toBe(1);
    expect(tree.paths).toEqual([...tree.paths].sort());
  });

  it("emits Terraform infrastructure files", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "infra",
          name: "infra",
          kind: "infrastructure",
          position: { x: 0, y: 0 },
          components: [
            { id: "terraform", category: "infrastructure" },
            { id: "docker-provider", category: "infrastructure" },
          ],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toContain("infra/main.tf");
    expect(tree.paths).toContain("infra/providers.tf");
    expect(tree.paths).toContain("infra/containers.tf");
    expect(tree.byService.infra).toEqual(
      expect.arrayContaining(["infra/containers.tf", "infra/main.tf", "infra/providers.tf"]),
    );
  });

  it("emits AWS infrastructure files from selected service components", () => {
    const spec: ArchitextSpec = {
      ...baseSpec,
      services: [
        {
          id: "infra",
          name: "infra",
          kind: "infrastructure",
          position: { x: 0, y: 0 },
          components: [
            { id: "aws-provider", category: "infrastructure" },
            { id: "aws-vpc-networking", category: "infrastructure" },
            { id: "aws-ecr", category: "infrastructure" },
            { id: "aws-ecs-fargate", category: "infrastructure" },
            { id: "aws-lambda", category: "infrastructure" },
            { id: "aws-api-gateway", category: "infrastructure" },
            { id: "aws-iam", category: "infrastructure" },
          ],
        },
      ],
    };
    const tree = computeFileTree(spec, catalog);
    expect(tree.paths).toEqual(
      expect.arrayContaining([
        "infra/providers.tf",
        "infra/network.tf",
        "infra/ecr.tf",
        "infra/ecs.tf",
        "infra/lambda.tf",
        "infra/api-gateway.tf",
        "infra/iam.tf",
        "infra/logs.tf",
      ]),
    );
  });
});
