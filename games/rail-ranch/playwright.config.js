import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const iphone = {
  ...devices['iPhone 13'],
  browserName: 'webkit',
  defaultBrowserType: 'webkit',
  hasTouch: true,
  isMobile: true,
};

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 90000,
  expect: { timeout: 12000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8771',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'python3 -m http.server 8771 --bind 127.0.0.1',
    cwd: root,
    port: 8771,
    reuseExistingServer: false,
    timeout: 20000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        hasTouch: false,
        deviceScaleFactor: 1,
      },
    },
    { name: 'iphone', use: iphone },
  ],
});
