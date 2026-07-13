import { defineConfig, devices } from '@playwright/test';

/**
 * Spec10x smoke suite (US-05-06-01 / D-05-04).
 *
 * Chromium-only by decision. Runs against a production build made with
 * NEXT_PUBLIC_E2E_AUTH_BYPASS=1 (see `npm run test:smoke`); every /api/*
 * request is intercepted with fixtures, so no backend or Firebase project
 * is needed.
 */
export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start:e2e',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
