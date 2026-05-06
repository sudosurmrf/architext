import { describe, it, expect } from "vitest";
import { PositionSchema, SizeSchema, IdSchema } from "../src/primitives";

describe("PositionSchema", () => {
  it("accepts {x, y} numbers", () => {
    expect(PositionSchema.parse({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(PositionSchema.parse({ x: -10.5, y: 200 })).toEqual({ x: -10.5, y: 200 });
  });

  it("rejects non-number coordinates", () => {
    expect(PositionSchema.safeParse({ x: "0", y: 0 }).success).toBe(false);
    expect(PositionSchema.safeParse({ x: NaN, y: 0 }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(PositionSchema.safeParse({ x: 0 }).success).toBe(false);
    expect(PositionSchema.safeParse({}).success).toBe(false);
  });
});

describe("SizeSchema", () => {
  it("accepts non-negative width and height", () => {
    expect(SizeSchema.parse({ width: 100, height: 50 })).toEqual({ width: 100, height: 50 });
    expect(SizeSchema.parse({ width: 0, height: 0 })).toEqual({ width: 0, height: 0 });
  });

  it("rejects negative dimensions", () => {
    expect(SizeSchema.safeParse({ width: -1, height: 50 }).success).toBe(false);
    expect(SizeSchema.safeParse({ width: 100, height: -1 }).success).toBe(false);
  });
});

describe("IdSchema", () => {
  it("accepts non-empty strings up to 128 chars", () => {
    expect(IdSchema.parse("a")).toBe("a");
    expect(IdSchema.parse("svc-api-1")).toBe("svc-api-1");
    expect(IdSchema.parse("x".repeat(128))).toBe("x".repeat(128));
  });

  it("rejects empty strings, non-strings, and over-long ids", () => {
    expect(IdSchema.safeParse("").success).toBe(false);
    expect(IdSchema.safeParse(42).success).toBe(false);
    expect(IdSchema.safeParse("x".repeat(129)).success).toBe(false);
  });
});
