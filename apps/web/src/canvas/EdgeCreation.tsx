/**
 * @module @architext/web/canvas/EdgeCreation
 * Concepts: [[EdgeCreation]], [[ProtocolModal]], [[ConnectionFlow]]
 * Spec: §4.5 Edge creation — protocol selection modal on connect; self-loop and duplicate rejection
 * Depends on: [[spec-store]] (addEdge, spec edges), [[@architext/schema]] (Protocol, Edge)
 * Consumed by: [[Canvas]] (onConnect handler + modal rendering)
 */

import { useCallback, useEffect, useState } from "react";
import type { Connection } from "@xyflow/react";
import type { Protocol, Edge } from "@architext/schema";
import { useSpecStore } from "../store/spec-store";

// ─── Protocol catalog ──────────────────────────────────────────────────

interface ProtocolOption {
  value: Protocol;
  label: string;
  description: string;
  color: string;
}

const PROTOCOLS: readonly ProtocolOption[] = [
  { value: "http",      label: "HTTP",      description: "REST / HTTP API",        color: "border-blue-300 hover:bg-blue-50" },
  { value: "graphql",   label: "GraphQL",   description: "GraphQL endpoint",       color: "border-pink-300 hover:bg-pink-50" },
  { value: "grpc",      label: "gRPC",      description: "Protocol Buffers RPC",   color: "border-orange-300 hover:bg-orange-50" },
  { value: "websocket", label: "WebSocket", description: "Bidirectional socket",    color: "border-green-300 hover:bg-green-50" },
  { value: "queue",     label: "Queue",     description: "Message queue / pub-sub", color: "border-yellow-300 hover:bg-yellow-50" },
  { value: "sql",       label: "SQL",       description: "SQL database wire",      color: "border-indigo-300 hover:bg-indigo-50" },
  { value: "key-value", label: "Key-Value", description: "KV store protocol",      color: "border-teal-300 hover:bg-teal-50" },
  { value: "fs",        label: "FS",        description: "Filesystem / volume",    color: "border-gray-300 hover:bg-gray-50" },
  { value: "event",     label: "Event",     description: "Event bus / rules",      color: "border-purple-300 hover:bg-purple-50" },
  { value: "object-storage", label: "Object", description: "S3/object storage",   color: "border-cyan-300 hover:bg-cyan-50" },
  { value: "identity",  label: "Identity",  description: "Auth / identity flow",   color: "border-emerald-300 hover:bg-emerald-50" },
  { value: "secret",    label: "Secret",    description: "Secrets/config access",  color: "border-red-300 hover:bg-red-50" },
  { value: "container-image", label: "Image", description: "Container image flow", color: "border-violet-300 hover:bg-violet-50" },
  { value: "lambda-invoke", label: "Lambda", description: "API Gateway invokes Lambda", color: "border-fuchsia-300 hover:bg-fuchsia-50" },
  { value: "human-review", label: "Human", description: "Approval / eval gate", color: "border-rose-300 hover:bg-rose-50" },
  { value: "decision", label: "Decision", description: "Conditional branch", color: "border-indigo-300 hover:bg-indigo-50" },
  { value: "dns",       label: "DNS",       description: "Domain / record target", color: "border-sky-300 hover:bg-sky-50" },
] as const;

// ─── Pending connection state ──────────────────────────────────────────

interface PendingConnection {
  source: string;
  target: string;
}

/** Generate a short unique id for the edge */
function generateEdgeId(source: string, target: string, protocol: Protocol): string {
  return `${source}-${protocol}-${target}`;
}

// ─── Hook: useEdgeCreation ─────────────────────────────────────────────

export interface EdgeCreationState {
  /** The pending connection awaiting protocol selection, or null */
  pendingConnection: PendingConnection | null;
  /** Self-loop error message, auto-dismisses */
  error: string | null;
  /** Callback to pass to ReactFlow's onConnect */
  onConnect: (connection: Connection) => void;
  /** Cancel the modal */
  onCancel: () => void;
  /** Select a protocol to finalize the edge */
  onSelectProtocol: (protocol: Protocol) => void;
  /** Check if a protocol is already used between the pending source/target */
  isDuplicate: (protocol: Protocol) => boolean;
}

export function useEdgeCreation(): EdgeCreationState {
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const specAddEdge = useSpecStore((s) => s.addEdge);
  const edges = useSpecStore((s) => s.spec.edges);

  // Auto-dismiss error after 2 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 2000);
    return () => clearTimeout(timer);
  }, [error]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, target } = connection;

      // Self-loop rejection
      if (source === target) {
        setError("Cannot create a self-loop: source and target must be different services.");
        return;
      }

      setPendingConnection({ source, target });
    },
    [],
  );

  const onCancel = useCallback(() => {
    setPendingConnection(null);
  }, []);

  const isDuplicate = useCallback(
    (protocol: Protocol): boolean => {
      if (!pendingConnection) return false;
      return edges.some(
        (e) =>
          e.from === pendingConnection.source &&
          e.to === pendingConnection.target &&
          e.protocol === protocol,
      );
    },
    [pendingConnection, edges],
  );

  const onSelectProtocol = useCallback(
    (protocol: Protocol) => {
      if (!pendingConnection) return;

      const edgeId = generateEdgeId(pendingConnection.source, pendingConnection.target, protocol);

      // Build the edge with useful defaults so the generated scaffold needs
      // less interpretation later.
      let edge: Edge;

      switch (protocol) {
        case "http":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            port: 3000,
            basePath: "/api",
          };
          break;
        case "graphql":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            port: 4000,
            path: "/graphql",
          };
          break;
        case "grpc":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            port: 50051,
          };
          break;
        case "websocket":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            port: 3001,
            path: "/ws",
          };
          break;
        case "queue":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            topicName: "default",
          };
          break;
        case "sql":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            database: "app",
            port: 5432,
          };
          break;
        case "key-value":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            namespace: "app",
          };
          break;
        case "fs":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            mountPath: "./data",
          };
          break;
        case "event":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            eventBus: "default",
            source: "app",
            detailType: "domain.event",
          };
          break;
        case "object-storage":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            bucket: "app-bucket",
            prefix: "/",
          };
          break;
        case "identity":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            provider: "cognito",
            scopes: ["openid", "email", "profile"],
          };
          break;
        case "secret":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            namespace: "app",
          };
          break;
        case "container-image":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            repository: "app",
            tag: "latest",
          };
          break;
        case "lambda-invoke":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            functionName: "handler",
            invocationType: "request-response",
            endpointVisibility: "private",
            authorizer: "iam",
          };
          break;
        case "human-review":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            reviewType: "approval",
            assignee: "human-reviewer",
            instructions: "Review payload and approve before forwarding.",
          };
          break;
        case "decision":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            condition: "confidence >= 0.8",
            branchLabel: "approved",
          };
          break;
        case "dns":
          edge = {
            id: edgeId,
            from: pendingConnection.source,
            to: pendingConnection.target,
            protocol,
            domainName: "app.example.com",
            recordType: "A",
          };
          break;
        default:
          protocol satisfies never;
          return;
      }

      try {
        specAddEdge(edge);
      } catch {
        // Duplicate or self-loop caught by spec-mutations — ignore silently
      }

      setPendingConnection(null);
    },
    [pendingConnection, specAddEdge],
  );

  return {
    pendingConnection,
    error,
    onConnect,
    onCancel,
    onSelectProtocol,
    isDuplicate,
  };
}

// ─── Modal component ───────────────────────────────────────────────────

export interface EdgeCreationModalProps {
  pendingConnection: PendingConnection | null;
  error: string | null;
  onCancel: () => void;
  onSelectProtocol: (protocol: Protocol) => void;
  isDuplicate: (protocol: Protocol) => boolean;
}

export function EdgeCreationModal({
  pendingConnection,
  error,
  onCancel,
  onSelectProtocol,
  isDuplicate,
}: EdgeCreationModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!pendingConnection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingConnection, onCancel]);

  // Error toast
  if (error) {
    return (
      <div className="fixed inset-x-0 top-4 z-50 flex justify-center">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 shadow-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!pendingConnection) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-[520px] rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          What kind of connection?
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {PROTOCOLS.map((p) => {
            const duplicate = isDuplicate(p.value);
            return (
              <button
                key={p.value}
                disabled={duplicate}
                onClick={() => onSelectProtocol(p.value)}
                className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                  duplicate
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-50"
                    : `${p.color} cursor-pointer`
                }`}
              >
                <span className="text-sm font-medium text-gray-800">{p.label}</span>
                <span className="text-xs text-gray-500">{p.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
