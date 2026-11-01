import { defineConfig, devices } from '@playwright/test';

const iphoneLandscape = {
  ...devices['iPhone 13'],
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8765',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    cwd: '..',
    port: 8765,
    reuseExistingServer: true,
    timeout: 20000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        launchOptions: { args: ['--js-flags=--expose-gc'] },
      },
    },
    {
      name: 'android',
      use: {
        browserName: 'chromium',
        viewport: { width: 915, height: 412 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
    },
    {
      name: 'iphone',
      use: { ...iphoneLandscape, browserName: 'chromium', defaultBrowserType: 'chromium' },
    },
    {
      name: 'webkit',
      use: { ...iphoneLandscape, browserName: 'webkit', defaultBrowserType: 'webkit' },
    },
  ],
});
