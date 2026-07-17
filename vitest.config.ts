import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Match the tsconfig "@/*" path alias.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` guards modules against client bundles. In the Node test
      // runner there is no client, so resolve it to a harmless empty module.
      "server-only": fileURLToPath(
        new URL("./tests/shims/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
  },
});
