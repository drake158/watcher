import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/unit/**/*.spec.ts",
      "tests/integration/**/*.spec.ts",
      "tests/performance/**/*.spec.ts",
    ],
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    passWithNoTests: false,
  },
});
