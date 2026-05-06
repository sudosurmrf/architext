# @architext/files-engine

Deterministic file-tree predictor for [Architext](../../README.md) specs.

`computeFileTree(spec, catalog)` returns the set of files predicted to exist after the agent scaffolds the spec — paths only, no contents. Used by:

- The web app's Files tab (live preview as the user edits).
- The CLI's prompt-enrichment pass (told to the agent as ground truth: "produce at least these files").

The output is a soft contract with the agent: the measurable success criterion becomes "did the agent produce at least every predicted file?"

## Usage

```typescript
import { computeFileTree } from "@architext/files-engine";
import { loadCatalog } from "@architext/catalog";

const tree = computeFileTree(spec, loadCatalog());
console.log(tree.paths);              // ["api/main.py", "api/requirements.txt", ...]
console.log(tree.byService["api"]);   // ["api/main.py", ...]
```
