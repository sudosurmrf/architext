import { describe, it, expect } from "vitest";
import { loadCatalog } from "../src/load";

describe("loadCatalog", () => {
  it("returns a Catalog with at least 22 entries (v1 scope)", () => {
    const cat = loadCatalog();
    expect(cat.entries.length).toBeGreaterThanOrEqual(22);
  });

  it("returns the same instance across calls (memoized)", () => {
    expect(loadCatalog()).toBe(loadCatalog());
  });

  it("has react in the library category", () => {
    const cat = loadCatalog();
    expect(cat.byId("react")?.category).toBe("library");
  });

  it("has postgres droppable as a database service", () => {
    const cat = loadCatalog();
    expect(cat.byKindIfService("database").map((e) => e.id)).toContain("postgres");
  });

  it("has terraform droppable as an infrastructure service", () => {
    const cat = loadCatalog();
    expect(cat.byKindIfService("infrastructure").map((e) => e.id)).toContain("terraform-stack");
    expect(cat.byCategory("infrastructure").map((e) => e.id)).toContain("docker-provider");
  });

  it("has a broad AWS infrastructure catalog with integration patterns", () => {
    const cat = loadCatalog();
    const awsEntries = cat.byCategory("infrastructure").filter((e) => e.tags.includes("aws"));
    expect(cat.byKindIfService("infrastructure").map((e) => e.id)).toContain("aws-terraform-stack");
    expect(awsEntries.map((e) => e.id)).toEqual(
      expect.arrayContaining([
        "aws-ecs-fargate",
        "aws-ecr",
        "aws-lambda",
        "aws-api-gateway",
        "aws-iam",
        "aws-sqs",
        "aws-eventbridge",
        "aws-rds",
        "aws-cognito",
      ]),
    );
    expect(awsEntries.length).toBeGreaterThanOrEqual(25);
    expect(cat.byId("aws-ecs-fargate")?.defaultConfig?.integrationPatterns).toEqual(
      expect.arrayContaining([
        "ALB listener forwards HTTP traffic to ECS target groups",
        "ECS tasks pull images from ECR and environment/secrets from SSM or Secrets Manager",
      ]),
    );
  });

  it("has first-class AI workflow nodes and gates", () => {
    const cat = loadCatalog();
    expect(cat.byKindIfService("ai-agent").map((e) => e.id)).toContain("ai-agent-service");
    expect(cat.byKindIfService("ai-model").map((e) => e.id)).toEqual(
      expect.arrayContaining(["openai-gpt-4o", "anthropic-claude-sonnet", "meta-llama"]),
    );
    expect(cat.byKindIfService("human-step").map((e) => e.id)).toContain("human-approval-step");
    expect(cat.byKindIfService("decision").map((e) => e.id)).toContain("decision-router");
    expect(cat.byCategory("ai").length).toBeGreaterThanOrEqual(6);
    expect(cat.byCategory("workflow").map((e) => e.id)).toEqual(
      expect.arrayContaining(["human-approval-step", "decision-router"]),
    );
  });
});
