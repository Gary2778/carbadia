import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", globals: true, include: ["src/**/*.test.{ts,tsx}"] },
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
