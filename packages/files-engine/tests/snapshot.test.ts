import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { computeFileTree } from "../src/compute";
import { loadCatalog } from "@architext/catalog";
import { ArchitextSpecSchema } from "@architext/schema";

const here = dirname(fileURLToPath(import.meta.url));
const REGENERATE = process.env.UPDATE_SNAPSHOTS === "1";

const cases = [
  {
    name: "frontend-backend-db",
    fixturePath: "../../schema/tests/fixtures/golden-frontend-backend-db.json",
    snapshotPath: "snapshot/frontend-backend-db.snap.json",
  },
  {
    name: "microservices",
    fixturePath: "../../schema/tests/fixtures/golden-microservices.json",
    snapshotPath: "snapshot/microservices.snap.json",
  },
];

describe("Files-engine snapshots vs schema golden fixtures", () => {
  const catalog = loadCatalog();

  for (const c of cases) {
    it(`${c.name} matches snapshot`, () => {
      const fixture = JSON.parse(readFileSync(resolve(here, c.fixturePath), "utf-8"));
      const spec = ArchitextSpecSchema.parse(fixture);
      const tree = computeFileTree(spec, catalog);
      const actual = { paths: tree.paths, byService: tree.byService };

      if (REGENERATE) {
        writeFileSync(
          resolve(here, c.snapshotPath),
          JSON.stringify(actual, null, 2) + "\n"
        );
      }

      const expected = JSON.parse(readFileSync(resolve(here, c.snapshotPath), "utf-8"));
      expect(actual).toEqual(expected);
    });
  }
});
