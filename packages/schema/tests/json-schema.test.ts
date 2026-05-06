import { describe, it, expect } from "vitest";
import { architextJsonSchema } from "../src/json-schema";

describe("JSON Schema export", () => {
  it("returns an object with $schema and type=object", () => {
    expect(architextJsonSchema.$schema).toBeDefined();
    expect(architextJsonSchema.type).toBe("object");
  });

  it("includes the top-level required fields", () => {
    const required = architextJsonSchema.required ?? [];
    expect(required).toContain("schemaVersion");
    expect(required).toContain("project");
    expect(required).toContain("groups");
    expect(required).toContain("services");
    expect(required).toContain("edges");
  });

  it("includes the schemaVersion enum/const for 0.1.0", () => {
    const props = architextJsonSchema.properties as Record<string, { const?: string; enum?: string[] }>;
    const v = props.schemaVersion;
    const isLiteral = v.const === "0.1.0" || (v.enum?.length === 1 && v.enum[0] === "0.1.0");
    expect(isLiteral).toBe(true);
  });
});
