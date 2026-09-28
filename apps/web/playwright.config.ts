import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // The update fixture advances one shared service worker version.
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/server.mjs',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
  },
})
