import { describe, it, expect } from "vitest";
import { makeCatalog } from "../src/catalog";
import type { CatalogEntry } from "../src/types";

const entries: CatalogEntry[] = [
  {
    id: "react",
    category: "library",
    name: "React",
    description: "UI lib",
    tags: ["frontend"],
    dropsAs: "component",
    compatibleServiceKinds: ["frontend-app"],
  },
  {
    id: "fastapi",
    category: "framework",
    name: "FastAPI",
    description: "Python API framework",
    tags: ["backend"],
    dropsAs: "component",
    compatibleServiceKinds: ["backend-service"],
  },
  {
    id: "postgres",
    category: "datastore",
    name: "PostgreSQL",
    description: "SQL db",
    tags: ["database"],
    dropsAs: "service",
    serviceKindIfService: "database",
  },
];

describe("makeCatalog", () => {
  it("returns an immutable view object", () => {
    const cat = makeCatalog(entries);
    expect(() => {
      // @ts-expect-error mutation should fail at runtime via Object.freeze
      cat.entries.push({} as CatalogEntry);
    }).toThrow();
  });

  it("byId looks up an entry", () => {
    const cat = makeCatalog(entries);
    expect(cat.byId("react")?.name).toBe("React");
    expect(cat.byId("missing")).toBeUndefined();
  });

  it("byCategory filters by category", () => {
    const cat = makeCatalog(entries);
    expect(cat.byCategory("library").map((e) => e.id)).toEqual(["react"]);
    expect(cat.byCategory("datastore").map((e) => e.id)).toEqual(["postgres"]);
    expect(cat.byCategory("language")).toEqual([]);
  });

  it("byCompatibleServiceKind returns components droppable into a service kind", () => {
    const cat = makeCatalog(entries);
    expect(cat.byCompatibleServiceKind("frontend-app").map((e) => e.id)).toEqual(["react"]);
    expect(cat.byCompatibleServiceKind("backend-service").map((e) => e.id)).toEqual(["fastapi"]);
  });

  it("byCompatibleServiceKind excludes service-creating tokens", () => {
    const cat = makeCatalog(entries);
    expect(cat.byCompatibleServiceKind("database")).toEqual([]);
  });

  it("byKindIfService returns service-creating tokens for a kind", () => {
    const cat = makeCatalog(entries);
    expect(cat.byKindIfService("database").map((e) => e.id)).toEqual(["postgres"]);
    expect(cat.byKindIfService("frontend-app")).toEqual([]);
  });

  it("rejects entries with duplicate ids on construction", () => {
    expect(() =>
      makeCatalog([entries[0]!, { ...entries[0]!, name: "duplicate" }])
    ).toThrow(/duplicate catalog id: react/);
  });
});
