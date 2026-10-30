import { defineConfig } from "vitest/config";

// Evaluaciones que leen corridas guardadas en interno/corridas (no corren con `npm test`).
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/**/*.eval.ts"],
  },
});
