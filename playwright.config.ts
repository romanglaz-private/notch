import { defineConfig, devices } from '@playwright/test';
import { loadNotchConfig } from './src/utils/notch-config';
import { resolvePlaywrightStorageState } from './src/utils/playwright-session';

/**
 * Reuse manual Google login: run `npm run auth:save`, then tests load this file.
 * Contains cookies + localStorage/sessionStorage per origin (Playwright format).
 */
const notch = loadNotchConfig();
const storageState = resolvePlaywrightStorageState();

/** Pauses & inspector stepping burn wall-clock time — allow 10 min when debugging. */
function isDebugRun(): boolean {
  if (process.env.PWDEBUG) return true;
  if (
    process.argv.some((arg) => arg === '--debug' || arg.startsWith('--debug='))
  ) {
    return true;
  }
  // VS Code / Cursor “JavaScript Debug Terminal” or launch.json attaches `--inspect*`.
  if (process.execArgv.some((arg) => arg.startsWith('--inspect'))) return true;
  return false;
}

const testTimeoutMs = isDebugRun() ? 600_000 : 120_000;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /** Normal 2 min; 10 min under Playwright/VS Code debug so timeouts don’t fire while paused. */
  timeout: testTimeoutMs,
  testMatch: '**/e2e.spec.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    ...(storageState ? { storageState } : {}),
    baseURL: notch.baseUrl,

    /* Local: retain trace on failure; CI: trace on retry when retries run */
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
