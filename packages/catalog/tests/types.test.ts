import { describe, it, expect } from "vitest";
import { CatalogEntrySchema, FileRuleSchema } from "../src/types";

describe("FileRuleSchema", () => {
  it("accepts a path-only rule", () => {
    expect(FileRuleSchema.safeParse({ path: "src/main.ts" }).success).toBe(true);
  });

  it("accepts a rule with `when` clauses", () => {
    const rule = {
      path: "src/main.tsx",
      when: { serviceKind: ["frontend-app"], requires: ["typescript"], excludes: ["javascript"] },
    };
    expect(FileRuleSchema.safeParse(rule).success).toBe(true);
  });

  it("rejects empty path", () => {
    expect(FileRuleSchema.safeParse({ path: "" }).success).toBe(false);
  });

  it("rejects unknown serviceKind in `when`", () => {
    expect(
      FileRuleSchema.safeParse({ path: "x", when: { serviceKind: ["weird-kind"] } }).success
    ).toBe(false);
  });
});

describe("CatalogEntrySchema (component variant)", () => {
  const minimalComponent = {
    id: "react",
    category: "library" as const,
    name: "React",
    description: "Component-based UI library",
    tags: ["frontend", "ui"],
    dropsAs: "component" as const,
    compatibleServiceKinds: ["frontend-app"],
  };

  it("accepts the minimal component entry", () => {
    expect(CatalogEntrySchema.safeParse(minimalComponent).success).toBe(true);
  });

  it("accepts optional fields (files, defaults, iconUrl)", () => {
    const full = {
      ...minimalComponent,
      files: [{ path: "src/main.tsx" }],
      defaultVersion: "^18.3.0",
      defaultConfig: { strict: true },
      iconUrl: "https://example.com/react.svg",
    };
    expect(CatalogEntrySchema.safeParse(full).success).toBe(true);
  });

  it("rejects component entry that includes serviceKindIfService", () => {
    expect(
      CatalogEntrySchema.safeParse({
        ...minimalComponent,
        serviceKindIfService: "database",
      }).success
    ).toBe(false);
  });

  it("rejects component entry without compatibleServiceKinds", () => {
    const bad = { ...minimalComponent } as Record<string, unknown>;
    delete bad.compatibleServiceKinds;
    expect(CatalogEntrySchema.safeParse(bad).success).toBe(false);
  });
});

describe("CatalogEntrySchema (service variant)", () => {
  const minimalService = {
    id: "postgres",
    category: "datastore" as const,
    name: "PostgreSQL",
    description: "Relational SQL database",
    tags: ["database", "sql"],
    dropsAs: "service" as const,
    serviceKindIfService: "database" as const,
  };

  it("accepts the minimal service entry", () => {
    expect(CatalogEntrySchema.safeParse(minimalService).success).toBe(true);
  });

  it("rejects service entry that includes compatibleServiceKinds", () => {
    expect(
      CatalogEntrySchema.safeParse({
        ...minimalService,
        compatibleServiceKinds: ["database"],
      }).success
    ).toBe(false);
  });

  it("rejects service entry without serviceKindIfService", () => {
    const bad = { ...minimalService } as Record<string, unknown>;
    delete bad.serviceKindIfService;
    expect(CatalogEntrySchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown dropsAs", () => {
    expect(
      CatalogEntrySchema.safeParse({ ...minimalService, dropsAs: "weird" }).success
    ).toBe(false);
  });
});
