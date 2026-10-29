import { defineConfig, devices } from '@playwright/test';

/**
 * TraceGuard End-to-End Playwright Configuration
 * Tests verify user journeys, demo mode exploration, scan detail tabs, and site comparison.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? [
        {
          command: 'node scripts/dev-api.mjs',
          port: 8000,
          reuseExistingServer: true,
          timeout: 30 * 1000,
        },
        {
          command: 'pnpm --filter @traceguard/dashboard start',
          port: 3000,
          reuseExistingServer: true,
          timeout: 60 * 1000,
        },
      ]
    : undefined,
});
