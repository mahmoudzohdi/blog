import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  webServer: {
    // Test build includes the showcase draft, so it goes to dist-test/ and never
    // into dist/, which is what gets deployed. `--ignore-lock` keeps `astro preview`
    // in the foreground: Astro 7 otherwise detaches it when run by an AI agent.
    command: 'npm run build:test && npm run preview -- --outDir dist-test --ignore-lock',
    url: 'http://localhost:4321/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
});
