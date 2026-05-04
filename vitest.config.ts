import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/test/**/*.test.tsx"],
          browser: {
            provider: playwright(),
            enabled: true,
            instances: [{ browser: "chromium" }],
            headless: true,
          },
        },
      },
      {
        extends: true,
        test: {
          name: "workers",
          include: ["src/test/**/*.test.ts"],
        },
      },
    ],
  },

  plugins: [
    tsconfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    react(),
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
});
