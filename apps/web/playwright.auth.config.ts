import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-auth",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4180",
    browserName: "chromium",
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter api start:prod",
      cwd: "../..",
      url: "http://127.0.0.1:3301/api/v1/health/live",
      env: { PORT: "3301" },
      reuseExistingServer: false,
    },
    {
      command:
        "pnpm exec vite preview --host 127.0.0.1 --port 4180 --strictPort",
      url: "http://127.0.0.1:4180",
      env: { DAYJOIN_API_PROXY_TARGET: "http://127.0.0.1:3301" },
      reuseExistingServer: false,
    },
  ],
});
