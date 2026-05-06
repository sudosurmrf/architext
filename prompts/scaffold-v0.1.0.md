# Architext Scaffold Prompt v0.1.0

You are scaffolding a project from a structured architecture specification.
Your job is to produce a running, idiomatic codebase that matches the spec
exactly. The user will run the resulting project with each service's standard
local dev command (e.g., `npm run dev`, `uvicorn main:app --reload`).

## Hard Constraints

- Write all files into the current working directory. Do NOT cd elsewhere.
- No Docker, no docker-compose, no Kubernetes — defer containerization.
- Each service must run with its standard local dev command after `npm install`
  / `pip install` etc. Document the dev command in the per-service README.
- Honor exact component versions when the spec specifies a `version` field.
  If no version is given, use the latest stable release of that component.
- Use the `protocol` field on each edge to determine wire format. The
  per-protocol guidance below is authoritative.
- Generate code that compiles / imports cleanly on first try. If a service has
  a TypeScript component, emit `tsconfig.json`. If a service has Python,
  emit `pyproject.toml` or `requirements.txt`. Etc.

## Spec Concepts

- **Groups** are logical containers. Emit a top-level directory per group only
  when the group has 2+ services. Otherwise, the service lives at the repo
  root with no group prefix.
- **Services** become directories with their own dependency manifest
  (package.json, pyproject.toml, go.mod, etc.) and an entry-point file.
- **Components** are libraries / frameworks / languages installed inside a
  service. Use the canonical install command for the ecosystem (`npm install`,
  `pip install`, `go get`).
- **Edges** are typed connections — generate the corresponding client code on
  the `from` side and the corresponding server / handler on the `to` side.
- **The spec's project.slug is the recommended top-level project name.** Use
  it for the package name, repository name, and README title.

## Per-Service-Kind Guidance

### `frontend-app`
Emit a SPA scaffold matching the framework component. For React + Vite:
`index.html`, `src/main.tsx` (or `.jsx`), `src/App.tsx`, `vite.config.ts`,
`tsconfig.json` (if TypeScript), `package.json` with `dev`, `build`,
`preview` scripts. For Next.js: `next.config.js`, `app/layout.tsx`,
`app/page.tsx`, etc. For Vue: `src/App.vue`, `src/main.ts`, `index.html`.

### `backend-service`
Emit a server scaffold matching the framework. For Express+TS: `src/index.ts`
with `app.listen(...)`. For FastAPI: `main.py` with `app = FastAPI()`. For
NestJS: `src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`. For
Django: `manage.py`, project module with `settings.py` and `urls.py`. Always
emit a `package.json` / `requirements.txt` listing the framework + listed
edges' client libraries.

### `worker`
Emit a long-running background process. The entry-point depends on the
service's `entry-point` components: a `queue-consumer` component implies the
service subscribes to an inbound queue; a `scheduled-job` component implies a
cron-like loop. Workers do NOT bind a port. Provide a `start` / `dev` script.

### `database`
Emit a `schema.sql` (Postgres / MySQL) or `schema.json` (MongoDB) file. Do
NOT emit application code in a `database` service — only the schema. Connection
information is consumed by the `from` side of any inbound `sql` or `key-value`
edge.

### `cache`
Emit no source files. The cache is referenced by edges; only the consuming
side gets a client. Optionally emit a `redis.conf` (or equivalent) if the
spec specifies non-default ports / configs.

### `queue`
Emit no source files unless the spec specifies broker config. Emit broker
config as `rabbitmq.conf` (or equivalent) when port / vhost differs from
defaults.

### `sidecar`
Emit a minimal observability scaffold (e.g., `otel-collector.yaml`) — usually
no application code.

### `external-api`
Emit a small client-stubs file with TypeScript / Python type interfaces for
the external service's responses. Treat it as a typed dependency, not a
service to run.

## Per-Protocol Guidance

For every edge `from → to` with the given protocol, emit BOTH ends:

### `http`
- On the `from` side: a typed HTTP client (axios for Node, httpx for Python).
  Use the `basePath` field as the prefix and `port` for the host port.
- On the `to` side: a route handler (Express route, FastAPI endpoint, Hono
  handler) at `basePath` returning a 200 stub.

### `graphql`
- On the `from` side: a GraphQL client (urql or Apollo Client for JS, gql
  for Python) initialized at the `path` URL.
- On the `to` side: a GraphQL server (graphql-yoga, Strawberry, Apollo
  Server) with one example query / mutation at `path`.

### `grpc`
- Emit a `<edge>.proto` file with one example service definition.
- On the `from` side: a generated gRPC client (`@grpc/grpc-js` for Node,
  `grpcio` for Python).
- On the `to` side: a gRPC server bound to `port`.

### `websocket`
- On the `from` side: a `WebSocket` client connecting to `path`.
- On the `to` side: a server-side upgrade handler echoing messages.

### `queue`
- On the `from` side (producer): a `publish(topic, payload)` helper using
  the spec's `topicName`. Use the `broker` field if specified, else default
  to amqp://localhost / redis://localhost as appropriate.
- On the `to` side (consumer): a `subscribe(topic, handler)` helper that
  invokes the user's handler for each message.

### `sql`
- On the `from` side: a connection pool (Prisma / Knex / SQLAlchemy /
  database/sql in Go) with the connection string `<protocol>://<user>:<pass>@<host>:<port>/<database>`.
- On the `to` side (the database service): no client code — see Database
  guidance above for schema.

### `key-value`
- On the `from` side: a Redis client (ioredis / redis-py) initialized with
  the optional `namespace` as a key prefix.
- On the `to` side (cache service): no client code.

### `fs`
- On the `from` side: a small `read(path)` / `write(path, data)` helper
  rooted at the spec's `mountPath`. Use Node's `fs/promises` or Python's
  `pathlib`.

## Repo-Wide Files

Always produce:
- `README.md` at the project root, naming each service and its dev command.
- `.gitignore` covering Node (`node_modules/`, `dist/`), Python (`__pycache__/`,
  `*.pyc`, `.venv/`), and editor files (`.vscode/`, `.idea/`, `.DS_Store`).
- `architext-spec.json` — copy the input spec verbatim into the repo root for
  round-trip / regenerate workflows.

## Output Protocol

1. First, output a single JSON plan on its own line (no surrounding prose):
   `{ "services": [{ "name": "<service.name>", "files": ["<rel/path>", ...] }] }`
2. Then, write each file using your file-writing tools. Path strings must
   match what you announced in step 1 — don't add or skip files silently.
3. Finish with the literal token, on its own line:
   `ARCHITEXT_DONE`
4. If you cannot complete the scaffold, finish with the token, on its own line:
   `ARCHITEXT_FAILED <one-line reason>`

The CLI watches stdout for these sentinel lines. Do not include them as part
of any other text.

## The Spec

Below is the JSON spec to scaffold. Treat it as the contract — every Service
listed here must end up as a directory in the output, every Edge must end up
as wired client + server stubs.
