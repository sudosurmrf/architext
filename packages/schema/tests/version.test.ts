import { describe, it, expect } from "vitest";
import { SCHEMA_VERSION, SchemaVersionSchema } from "../src/version";

describe("SCHEMA_VERSION", () => {
  it("is the literal '0.1.0'", () => {
    expect(SCHEMA_VERSION).toBe("0.1.0");
  });

  it("SchemaVersionSchema accepts the constant", () => {
    expect(SchemaVersionSchema.safeParse(SCHEMA_VERSION).success).toBe(true);
  });

  it("SchemaVersionSchema rejects other strings", () => {
    expect(SchemaVersionSchema.safeParse("0.2.0").success).toBe(false);
    expect(SchemaVersionSchema.safeParse("1.0.0").success).toBe(false);
    expect(SchemaVersionSchema.safeParse("").success).toBe(false);
  });
});
