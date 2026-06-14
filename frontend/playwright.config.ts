import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
      NEXT_PUBLIC_API_MOCKING: "enabled",
      NEXT_PUBLIC_DEMO_BUSINESS_SLUG: "kopi-senja-umkm",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
