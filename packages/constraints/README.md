# @architext/constraints

Compiles an Architext spec into a deterministic workflow/constraint manifest.

```ts
import { compileWorkflowManifest } from "@architext/constraints";

const manifest = compileWorkflowManifest(spec);
```

The manifest is emitted as `architext-workflow.json` beside `architext-spec.json`.
