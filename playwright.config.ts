import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

// Chromium only: axe results are engine-independent enough; Firefox/WebKit are covered by the manual checklist.
export default defineConfig({
  testDir: './tests',
  retries: CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4321', ...devices['Desktop Chrome'] },
  // PW_CHROMIUM_PATH: optional system Chromium (e.g. NixOS, where downloaded browsers cannot run).
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {} },
  }],
  webServer: {
    // --ignore-lock: Astro 7 auto-backgrounds preview when it detects an AI agent, which makes Playwright think it exited.
    command: 'npx astro preview --port 4321 --ignore-lock',
    url: 'http://localhost:4321',
    reuseExistingServer: !CI,
  },
});
