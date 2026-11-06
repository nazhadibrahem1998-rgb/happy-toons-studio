import { defineConfig, devices } from '@playwright/test';

const iphone = {
  ...devices['iPhone 13'],
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium',
};

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8767',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'python3 -m http.server 8767 --bind 127.0.0.1',
    port: 8767,
    reuseExistingServer: false,
    timeout: 20000,
  },
  projects: [
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
    },
    {
      name: 'desktop-1080',
      use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
    },
    {
      name: 'iphone-landscape',
      use: { ...iphone, browserName: 'webkit', viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } },
    },
    {
      name: 'iphone-portrait',
      use: { ...iphone, browserName: 'webkit', viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } },
    },
    {
      name: 'android',
      use: {
        browserName: 'chromium',
        viewport: { width: 915, height: 412 },
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
    },
  ],
});
