import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bun apps/cli/src/main.ts",
      url: "http://127.0.0.1:5551/health",
      reuseExistingServer: false,
    },
    {
      command: "bunx vite --host 127.0.0.1 --port 5173",
      cwd: "apps/web",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
    },
  ],
});
