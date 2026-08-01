import { defineConfig } from "vitest/config";
import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // Integration tests hit a running dev server sequentially — keep them in
    // one file-parallel batch but give slow wallet flows generous timeouts.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
