import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "admin-production",
      testMatch: "admin-production.spec.ts",
      use: { baseURL: "http://127.0.0.1:4174" },
    },
    {
      name: "desktop-chromium",
      testMatch: "ui.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      testMatch: "ui.spec.ts",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "connected-ui",
      testMatch: "connected.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "admin-desktop",
      testMatch: "admin.spec.ts",
      use: {
        baseURL: "http://127.0.0.1:5174",
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "admin-mobile",
      testMatch: "admin.spec.ts",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        baseURL: "http://127.0.0.1:5174",
      },
    },
    {
      name: "admin-connected",
      testMatch: "admin-connected.spec.ts",
      use: { baseURL: "http://127.0.0.1:5174" },
    },
    {
      name: "admin-api",
      testMatch: "admin-api.spec.ts",
      use: { baseURL: "http://127.0.0.1:8788" },
    },
    {
      name: "worker-api",
      testMatch: "api.spec.ts",
      use: { baseURL: "http://127.0.0.1:8787" },
    },
  ],
  webServer: [
    {
      command:
        "npx vite preview --config vite.admin.config.ts --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 90000,
    },
    {
      command: "npm run admin:api",
      url: "http://127.0.0.1:8788/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 90000,
    },
    {
      command: "npm run admin:dev",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 90000,
    },
    {
      command: "npm run api:dev",
      url: "http://127.0.0.1:8787/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 90000,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 90000,
    },
  ],
});
