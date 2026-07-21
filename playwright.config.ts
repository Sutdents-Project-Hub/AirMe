import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4181);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 1280, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `EXPO_PUBLIC_API_BASE_URL=/api npm run build:web --workspace airme && node tests/e2e/static-server.mjs --port ${port}`,
    url: baseURL,
    // A reused local server can belong to another project and turn an E2E run
    // into a false result. Always start the static export that this config built.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
