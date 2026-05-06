import { describe, it, expect } from "vitest";
import { ArchitextSpecSchema, SCHEMA_VERSION } from "@architext/schema";
import { loadPatterns } from "../src/load";
import { instantiatePattern } from "../src/instantiate";

describe("Golden instantiate: every v1 pattern produces a valid spec when wrapped", () => {
  const lib = loadPatterns();

  for (const pattern of lib.entries) {
    it(`${pattern.id} → valid ArchitextSpec`, () => {
      let n = 0;
      const fragment = instantiatePattern(pattern, { x: 100, y: 100 }, () => `id-${++n}`);
      const spec = {
        schemaVersion: SCHEMA_VERSION,
        project: { name: "Test", slug: "test" },
        groups: fragment.groups,
        services: fragment.services,
        edges: fragment.edges,
      };
      const result = ArchitextSpecSchema.safeParse(spec);
      if (!result.success) {
        console.error(JSON.stringify(result.error.format(), null, 2));
      }
      expect(result.success).toBe(true);
    });
  }
});
