import { PatternSchema, type Pattern } from "../types";

export const ragPipeline: Pattern = PatternSchema.parse({
  id: "rag-pipeline",
  name: "RAG Pipeline",
  description: "Document ingestion, vector storage, retrieval, AI agent, and response formatting.",
  preview: "ingest → vectordb → retrieve → agent → format",
  fragment: {
    services: [
      { name: "ingestion", kind: "worker",           tmpId: "ingest",    offset: { x: 0,    y: 0 } },
      { name: "vector-db", kind: "database",         tmpId: "vectordb",  offset: { x: 300,  y: 0 } },
      { name: "retrieval", kind: "backend-service",  tmpId: "retrieval", offset: { x: 600,  y: 0 } },
      { name: "agent",     kind: "ai-agent",         tmpId: "agent",     offset: { x: 900,  y: 0 } },
      { name: "formatter", kind: "backend-service",  tmpId: "formatter", offset: { x: 1200, y: 0 } },
    ],
    edges: [
      { from: "ingest",    to: "vectordb",  protocol: "fs",        mountPath: "/vectors" },
      { from: "retrieval", to: "vectordb",  protocol: "key-value", namespace: "vectors" },
      { from: "agent",     to: "retrieval", protocol: "http",      basePath: "/retrieve" },
      { from: "agent",     to: "formatter", protocol: "http",      basePath: "/format" },
    ],
  },
});
