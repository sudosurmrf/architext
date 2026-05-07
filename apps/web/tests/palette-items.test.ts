import { describe, expect, it } from "vitest";
import { loadCatalog } from "@architext/catalog";
import { getItemsForCategory } from "../src/palette/palette-items";

describe("palette items", () => {
  it("shows AWS infrastructure entries in the AWS palette lane", () => {
    const items = getItemsForCategory("aws", loadCatalog(), []);
    expect(items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "aws-ecs-fargate",
        "aws-ecr",
        "aws-lambda",
        "aws-api-gateway",
        "aws-iam",
      ]),
    );
    expect(items.find((item) => item.id === "aws-ecs-fargate")?.integrationPatterns?.length).toBeGreaterThan(1);
  });

  it("drops AWS catalog resources as their own infrastructure service nodes", () => {
    const items = getItemsForCategory("aws", loadCatalog(), []);
    const ecs = items.find((item) => item.id === "aws-ecs-fargate");
    expect(ecs?.dragItem.type).toBe("service-token");
    if (ecs?.dragItem.type !== "service-token") {
      throw new Error("expected ECS to be draggable as a service node");
    }
    expect(ecs.dragItem.serviceKind).toBe("infrastructure");
    expect(ecs.dragItem.catalogId).toBe("aws-ecs-fargate");
    expect(ecs.dragItem.category).toBe("infrastructure");
    expect(ecs.dragItem.defaultConfig).toMatchObject({ launchType: "FARGATE" });
  });

  it("keeps AWS resources out of the generic infrastructure palette lane", () => {
    const items = getItemsForCategory("infrastructure", loadCatalog(), []);
    expect(items.map((item) => item.id)).not.toContain("aws-ecs-fargate");
    expect(items.map((item) => item.id)).toContain("terraform");
  });
});
