const { defineConfig, devices } = require('@playwright/test');

const iphoneLandscape = {
  ...devices['iPhone 13'],
  viewport: { width: 844, height: 390 },
  screen: { width: 844, height: 390 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'webkit',
};

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 120000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8773',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'python3 -m http.server 8773 --bind 127.0.0.1',
    port: 8773,
    reuseExistingServer: false,
    timeout: 20000,
  },
  projects: [
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
    },
    {
      name: 'iphone',
      use: { ...iphoneLandscape, browserName: 'webkit' },
    },
    {
      name: 'iphone-portrait',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
