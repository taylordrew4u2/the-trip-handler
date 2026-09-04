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
  },
});
