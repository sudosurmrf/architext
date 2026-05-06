import { describe, it, expect } from "vitest";
import { ProjectMetaSchema } from "../src/project";

describe("ProjectMetaSchema", () => {
  it("accepts the minimal valid project", () => {
    const result = ProjectMetaSchema.parse({ name: "My App", slug: "my-app" });
    expect(result.name).toBe("My App");
    expect(result.slug).toBe("my-app");
  });

  it("accepts optional fields", () => {
    const result = ProjectMetaSchema.parse({
      name: "My App",
      slug: "my-app",
      description: "An app.",
      defaultBranch: "main",
    });
    expect(result.description).toBe("An app.");
    expect(result.defaultBranch).toBe("main");
  });

  it("requires name and slug", () => {
    expect(ProjectMetaSchema.safeParse({ slug: "x" }).success).toBe(false);
    expect(ProjectMetaSchema.safeParse({ name: "x" }).success).toBe(false);
  });

  it("rejects non-slug-safe slug values", () => {
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "Has Spaces" }).success).toBe(false);
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "Has/Slash" }).success).toBe(false);
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "" }).success).toBe(false);
  });

  it("accepts kebab-case and lowercase-with-numbers slugs", () => {
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "my-app-2" }).success).toBe(true);
    expect(ProjectMetaSchema.safeParse({ name: "x", slug: "abc123" }).success).toBe(true);
  });
});
