import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ArchitextSpecSchema } from "../src/spec";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = ["golden-frontend-backend-db.json", "golden-microservices.json"];

describe("Round-trip", () => {
  for (const name of fixtures) {
    it(`parses, re-serializes, and re-parses ${name} to identical output`, () => {
      const raw = readFileSync(resolve(here, "fixtures", name), "utf-8");
      const parsed1 = ArchitextSpecSchema.parse(JSON.parse(raw));
      const reserialized = JSON.stringify(parsed1);
      const parsed2 = ArchitextSpecSchema.parse(JSON.parse(reserialized));
      expect(parsed2).toEqual(parsed1);
    });
  }
});
