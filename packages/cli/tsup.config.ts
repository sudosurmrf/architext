import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts", "src/create-bin.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  banner: ({ format }) => {
    return format === "esm"
      ? { js: "#!/usr/bin/env node\n// @architext/cli — auto-generated; see src/bin.ts" }
      : { js: "#!/usr/bin/env node\n// @architext/cli — auto-generated; see src/bin.ts" };
  },
  onSuccess: async () => {
    const repoRoot = resolve(__dirname, "..", "..");
    const src = resolve(repoRoot, "prompts");
    const dest = resolve(__dirname, "prompts");
    try {
      mkdirSync(dest, { recursive: true });
      copyFileSync(
        resolve(src, "scaffold-v0.1.0.md"),
        resolve(dest, "scaffold-v0.1.0.md")
      );
    } catch (err) {
      console.warn("[tsup onSuccess] could not copy prompts:", err);
    }
  },
});
