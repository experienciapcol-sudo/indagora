import { defineConfig } from "vitest/config";

// Solo pruebas del Worker y de la configuración. Los scripts/*.test.mjs corren con node --test.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
