/**
 * @module @architext/catalog/data/ai
 * Concepts: [[AIWorkflow]], [[ModelNode]], [[AgentNode]], [[HumanApproval]], [[DecisionRouter]]
 * Depends on: [[types]] (CatalogEntrySchema)
 * Consumed by: [[data/index]]
 */

import { CatalogEntrySchema, type CatalogEntry } from "../types";

const raw = [
  {
    id: "ai-agent-service",
    category: "ai",
    name: "AI Agent",
    description: "Tool-using agent that plans, calls tools, and returns structured output",
    tags: ["ai", "agent", "workflow", "tools"],
    dropsAs: "service",
    serviceKindIfService: "ai-agent",
    files: [
      { path: "src/agent.ts" },
      { path: "src/tools.ts" },
      { path: "src/policy.ts" },
      { path: "package.json" },
      { path: "README.md" },
    ],
    defaultConfig: {
      orchestration: "tool-calling",
      memory: "thread-local",
      integrationPatterns: [
        "Agent reads normalized input, selects tools, and emits typed decisions",
        "Agent can route uncertain outputs to a human-step before continuation",
        "Agent calls model nodes through provider SDKs or local inference endpoints",
      ],
    },
  },
  {
    id: "human-approval-step",
    category: "workflow",
    name: "Human Approval",
    description: "Manual review, approval, edit, or escalation gate in a workflow",
    tags: ["workflow", "human", "approval", "evaluation", "handoff"],
    dropsAs: "service",
    serviceKindIfService: "human-step",
    files: [
      { path: "approval-contract.md" },
      { path: "review-schema.json" },
      { path: "README.md" },
    ],
    defaultConfig: {
      reviewTypes: ["approval", "edit", "evaluation", "escalation"],
      integrationPatterns: [
        "Pause workflow execution until an assigned reviewer approves or edits payload",
        "Store reviewer decision, comments, and audit metadata before forwarding",
        "Escalate low-confidence, high-risk, or policy-sensitive model outputs",
      ],
    },
  },
  {
    id: "decision-router",
    category: "workflow",
    name: "Decision Router",
    description: "Branching node that routes data by rules, scores, labels, or model output",
    tags: ["workflow", "branching", "rules", "router", "decision"],
    dropsAs: "service",
    serviceKindIfService: "decision",
    files: [
      { path: "decision-rules.json" },
      { path: "src/router.ts" },
      { path: "README.md" },
    ],
    defaultConfig: {
      routingMode: "rules",
      integrationPatterns: [
        "Route by deterministic condition such as score, label, status, or confidence",
        "Use fallback branch when no condition matches",
        "Send selected branches to agents, human approvals, queues, or external APIs",
      ],
    },
  },
  {
    id: "openai-gpt-4o",
    category: "ai",
    name: "OpenAI GPT-4o",
    description: "Multimodal OpenAI model for text, vision, and tool-assisted workflows",
    tags: ["ai", "model", "openai", "multimodal", "hosted"],
    dropsAs: "service",
    serviceKindIfService: "ai-model",
    files: [{ path: "model-contract.md" }, { path: "README.md" }],
    defaultConfig: {
      provider: "openai",
      model: "gpt-4o",
      modalities: ["text", "vision"],
      integrationPatterns: [
        "Agent or backend calls model with structured outputs for downstream routing",
        "Low-confidence or policy-sensitive results can route to human approval",
      ],
    },
  },
  {
    id: "anthropic-claude-sonnet",
    category: "ai",
    name: "Anthropic Claude Sonnet",
    description: "Claude Sonnet model for reasoning, tool use, and long-context tasks",
    tags: ["ai", "model", "anthropic", "claude", "hosted"],
    dropsAs: "service",
    serviceKindIfService: "ai-model",
    files: [{ path: "model-contract.md" }, { path: "README.md" }],
    defaultConfig: {
      provider: "anthropic",
      model: "claude-sonnet",
      modalities: ["text", "vision"],
      integrationPatterns: [
        "Agent calls Claude for reasoning-heavy steps and emits JSON output",
        "Decision router branches on confidence, classification, or extracted fields",
      ],
    },
  },
  {
    id: "google-gemini-pro",
    category: "ai",
    name: "Google Gemini Pro",
    description: "Gemini model endpoint for multimodal generation and analysis",
    tags: ["ai", "model", "google", "gemini", "hosted"],
    dropsAs: "service",
    serviceKindIfService: "ai-model",
    files: [{ path: "model-contract.md" }, { path: "README.md" }],
    defaultConfig: {
      provider: "google",
      model: "gemini-pro",
      modalities: ["text", "vision"],
      integrationPatterns: [
        "Backend or agent calls Gemini for extraction, classification, or generation",
        "Decision router handles model scores and safety outcomes",
      ],
    },
  },
  {
    id: "meta-llama",
    category: "ai",
    name: "Meta Llama",
    description: "Open-weight Llama model served through local or hosted inference",
    tags: ["ai", "model", "open-source", "llama", "local"],
    dropsAs: "service",
    serviceKindIfService: "ai-model",
    files: [{ path: "model-contract.md" }, { path: "inference-server.md" }, { path: "README.md" }],
    defaultConfig: {
      provider: "self-hosted",
      model: "llama",
      serving: ["ollama", "vllm", "tgi"],
      integrationPatterns: [
        "Agent calls local inference endpoint for private or cost-sensitive workloads",
        "Human review catches uncertain local-model outputs before external action",
      ],
    },
  },
  {
    id: "mistral-open-model",
    category: "ai",
    name: "Mistral Open Model",
    description: "Open Mistral model served locally or through a hosted provider",
    tags: ["ai", "model", "open-source", "mistral", "local"],
    dropsAs: "service",
    serviceKindIfService: "ai-model",
    files: [{ path: "model-contract.md" }, { path: "inference-server.md" }, { path: "README.md" }],
    defaultConfig: {
      provider: "self-hosted",
      model: "mistral",
      serving: ["ollama", "vllm", "tgi"],
      integrationPatterns: [
        "Backend calls Mistral for classification, summarization, or extraction",
        "Decision router compares score thresholds before triggering human review",
      ],
    },
  },
  {
    id: "embedding-model",
    category: "ai",
    name: "Embedding Model",
    description: "Embedding endpoint for retrieval, similarity, clustering, and routing",
    tags: ["ai", "model", "embeddings", "retrieval", "rag"],
    dropsAs: "service",
    serviceKindIfService: "ai-model",
    files: [{ path: "embedding-contract.md" }, { path: "README.md" }],
    defaultConfig: {
      task: "embeddings",
      integrationPatterns: [
        "Backend writes embeddings to a vector store for retrieval",
        "Agent retrieves context before model calls and routes weak matches to fallback branches",
      ],
    },
  },
] as const;

export const ai: readonly CatalogEntry[] = Object.freeze(
  raw.map((e) => CatalogEntrySchema.parse(e)),
);
