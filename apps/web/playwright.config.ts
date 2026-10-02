import { defineConfig, devices } from "@playwright/test";
const port = process.env.E2E_PORT ?? "3000";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      ...(process.env.E2E_BROWSER_CHANNEL
        ? { channel: process.env.E2E_BROWSER_CHANNEL }
        : {}),
    },
  }],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    env: { NEXT_PUBLIC_DATA_MODE: "demo", E2E_DIST_DIR: ".next-e2e" },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: process.env.E2E_USE_EXISTING_SERVER === "1",
    timeout: 120000,
  },
});
