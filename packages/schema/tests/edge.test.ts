import { describe, it, expect } from "vitest";
import { ProtocolSchema, EdgeSchema } from "../src/edge";

describe("ProtocolSchema", () => {
  it("accepts each documented protocol", () => {
    const ps = ["http", "graphql", "grpc", "websocket", "queue", "sql", "key-value", "fs"];
    for (const p of ps) {
      expect(ProtocolSchema.safeParse(p).success).toBe(true);
    }
  });

  it("rejects unknown protocols", () => {
    expect(ProtocolSchema.safeParse("smtp").success).toBe(false);
  });
});

describe("EdgeSchema (discriminated union)", () => {
  const baseId = { id: "e1", from: "s1", to: "s2" };

  it("accepts http with optional fields", () => {
    expect(EdgeSchema.safeParse({ ...baseId, protocol: "http" }).success).toBe(true);
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "http", port: 8080, basePath: "/api" }).success
    ).toBe(true);
  });

  it("accepts queue with required topicName", () => {
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "queue", topicName: "events" }).success
    ).toBe(true);
  });

  it("rejects queue without topicName", () => {
    expect(EdgeSchema.safeParse({ ...baseId, protocol: "queue" }).success).toBe(false);
  });

  it("rejects http with queue-only fields", () => {
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "http", topicName: "x" }).success
    ).toBe(false);
  });

  it("rejects queue with http-only fields", () => {
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "queue", topicName: "x", basePath: "/api" })
        .success
    ).toBe(false);
  });

  it("accepts sql with optional database and port", () => {
    expect(
      EdgeSchema.safeParse({ ...baseId, protocol: "sql", database: "app", port: 5432 }).success
    ).toBe(true);
  });

  it("rejects unknown protocol", () => {
    expect(EdgeSchema.safeParse({ ...baseId, protocol: "smtp" }).success).toBe(false);
  });

  it("rejects empty from/to", () => {
    expect(EdgeSchema.safeParse({ id: "e1", from: "", to: "s2", protocol: "http" }).success).toBe(false);
    expect(EdgeSchema.safeParse({ id: "e1", from: "s1", to: "", protocol: "http" }).success).toBe(false);
  });
});
