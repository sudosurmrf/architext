import { describe, it, expect } from "vitest";
import { applyWhen } from "../src/apply-when";
import type { FileRule } from "@architext/catalog";
import type { ServiceKind } from "@architext/schema";

const presentIds = new Set(["typescript", "react"]);
const kind: ServiceKind = "frontend-app";

describe("applyWhen", () => {
  it("includes rules with no `when` clause", () => {
    const rule: FileRule = { path: "src/index.ts" };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });

  it("includes rules whose serviceKind matches", () => {
    const rule: FileRule = { path: "x", when: { serviceKind: ["frontend-app"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });

  it("excludes rules whose serviceKind doesn't match", () => {
    const rule: FileRule = { path: "x", when: { serviceKind: ["backend-service"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(false);
  });

  it("includes rules whose `requires` are all present", () => {
    const rule: FileRule = { path: "x", when: { requires: ["typescript"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });

  it("excludes rules whose `requires` are not all present", () => {
    const rule: FileRule = { path: "x", when: { requires: ["typescript", "vue"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(false);
  });

  it("includes rules whose `excludes` are all absent", () => {
    const rule: FileRule = { path: "x", when: { excludes: ["python"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });

  it("excludes rules whose `excludes` overlap with present ids", () => {
    const rule: FileRule = { path: "x", when: { excludes: ["typescript"] } };
    expect(applyWhen(rule, kind, presentIds)).toBe(false);
  });

  it("combines multiple `when` clauses with AND semantics", () => {
    const rule: FileRule = {
      path: "x",
      when: { serviceKind: ["frontend-app"], requires: ["typescript"], excludes: ["python"] },
    };
    expect(applyWhen(rule, kind, presentIds)).toBe(true);
  });
});
