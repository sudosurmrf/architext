# @architext/patterns

Composite drop templates for the [Architext](../../README.md) canvas.

A pattern is a pre-wired sub-spec dropped as a single unit (e.g., "REST API + DB" places a backend-service, a database, and an HTTP+SQL edge in one undo step). The schema lives in `src/types.ts`; the concrete patterns live in `src/data/`.

## Usage

```typescript
import { randomUUID } from "node:crypto";
import { loadPatterns, instantiatePattern } from "@architext/patterns";

const all = loadPatterns();
const restApi = all.byId("rest-api-with-db")!;
const fragment = instantiatePattern(restApi, { x: 100, y: 100 }, () => randomUUID());
```
