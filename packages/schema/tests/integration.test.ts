import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  ArchitextSpecSchema,
  SCHEMA_VERSION,
  type ArchitextSpec,
  type Service,
  type Edge,
} from "../src";
import { architextJsonSchema } from "../src/json-schema";

const here = dirname(fileURLToPath(import.meta.url));

describe("Public API integration", () => {
  it("exports SCHEMA_VERSION as 0.1.0", () => {
    expect(SCHEMA_VERSION).toBe("0.1.0");
  });

  it("validates a real-world golden fixture end-to-end", () => {
    const raw = readFileSync(
      resolve(here, "fixtures", "golden-frontend-backend-db.json"),
      "utf-8"
    );
    const spec: ArchitextSpec = ArchitextSpecSchema.parse(JSON.parse(raw));

    expect(spec.services).toHaveLength(3);
    const api: Service | undefined = spec.services.find((s) => s.id === "api");
    expect(api?.kind).toBe("backend-service");

    const sqlEdge: Edge | undefined = spec.edges.find((e) => e.protocol === "sql");
    expect(sqlEdge).toBeDefined();
    if (sqlEdge?.protocol === "sql") {
      expect(sqlEdge.database).toBe("notes");
    }
  });

  it("exports a JSON Schema with the expected top-level keys", () => {
    expect(architextJsonSchema.type).toBe("object");
    expect(architextJsonSchema.required).toEqual(
      expect.arrayContaining(["schemaVersion", "project", "groups", "services", "edges"])
    );
  });
});
