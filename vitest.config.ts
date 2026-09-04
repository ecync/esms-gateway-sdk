import { defineConfig } from "vitest/config";

// Vitest configuration for the eSMS SDK test suite.
// Globals are left off on purpose: every test file imports describe/it/expect
// explicitly, which keeps the test files self-documenting and avoids relying
// on ambient types that could mask a missing import.
export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/types/**"]
    }
  }
});
