import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Row-level security tests. They need a running local Supabase (npx supabase start).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/rls/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
