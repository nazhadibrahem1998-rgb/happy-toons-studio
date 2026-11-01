import { defineConfig, devices } from '@playwright/test';

const iphone = devices['iPhone 13'];

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  expect: { timeout: 12000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8770',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'python3 -m http.server 8770 --bind 127.0.0.1',
    cwd: '..',
    port: 8770,
    reuseExistingServer: true,
    timeout: 20000,
  },
  projects: [
    {
      name: 'iphone-portrait',
      use: {
        ...iphone,
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iphone-landscape',
      use: {
        ...iphone,
        browserName: 'webkit',
        viewport: { width: 844, height: 390 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'android',
      use: {
        browserName: 'chromium',
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
    },
  ],
});
