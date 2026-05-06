import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
    // Use forks pool so tests can call process.chdir / mutate process.env safely.
    pool: "forks",
  },
});
