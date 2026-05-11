import { describe, expect, it } from "vitest";
import { BusinessContextSchema } from "../src/business-context";

describe("BusinessContextSchema", () => {
  it("accepts guided fields and freeform notes", () => {
    const result = BusinessContextSchema.parse({
      purpose: "Route high-risk applications to review.",
      businessRules: ["Reject duplicate requests"],
      inputs: ["application payload"],
      outputs: ["routing decision"],
      edgeCases: ["missing score"],
      acceptanceCriteria: ["approved requests continue"],
      notes: "Used by underwriting.",
    });
    expect(result.businessRules?.[0]).toBe("Reject duplicate requests");
  });

  it("rejects empty strings in list fields", () => {
    expect(BusinessContextSchema.safeParse({ businessRules: [""] }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(BusinessContextSchema.safeParse({ owner: "ops" }).success).toBe(false);
  });
});
