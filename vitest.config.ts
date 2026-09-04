import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./") },
  },
  test: {
    environment: "node",
    // Unit tests only. The end-to-end suite lives in tests/e2e as *.spec.ts
    // and runs under Playwright (`npm run test:e2e`), which needs a browser
    // and a built, seeded app.
    include: ["tests/**/*.test.ts"],

    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      /**
       * Scoped to the decision logic — the modules where a mistake is a
       * correctness or authorization bug, and where a unit test is the right
       * tool. Everything else (pages, components, the action bodies that mostly
       * marshal Prisma calls) is covered by the 146 end-to-end assertions
       * instead, and measuring it here would produce a number that moves for
       * reasons unrelated to whether the tested logic is tested.
       */
      include: ["lib/authz.ts", "lib/approval.ts", "lib/nav.ts"],
      thresholds: {
        // A ratchet, not a target: it fails the build if a suite is deleted or
        // a branch stops being exercised. Raising it by testing getters would
        // not make the app safer.
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 80,
      },
    },
  },
});
