import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
      "server-only": path.resolve(dirname, "vitest.server-only-stub.ts"),
      "@payload-config": path.resolve(dirname, "src/payload.config.ts"),
    },
  },
});
