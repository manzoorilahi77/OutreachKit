import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { setupFiles: ["tests/setup-env.ts"], include: ["tests/**/*.test.ts", "src/**/*.test.ts"] },
});
