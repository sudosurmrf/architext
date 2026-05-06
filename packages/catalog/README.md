# @architext/catalog

Component, framework, and library catalog for [Architext](../../README.md).

This package is **data, not code**: each entry describes a draggable item in the canvas palette and the file contributions it makes when present in a service. The Zod-validated schema lives in `src/types.ts`; the concrete entries live in `src/data/`.

## Usage

```typescript
import { loadCatalog } from "@architext/catalog";

const catalog = loadCatalog();
const react = catalog.byId("react");
const frameworks = catalog.byCategory("framework");
```

## Adding entries

Add a TS module under `src/data/`, export an array of validated entries, then list it in `src/data/index.ts`. The build will fail if any entry is malformed.
