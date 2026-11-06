import { expect, test } from '@playwright/test';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__PB);
}

test('English stays the default and the owner credit is on the menu', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('paddle-ball-settings', JSON.stringify({ lang: 'ckb', sound: true }));
  });
  await boot(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle(/Paddle Ball/);
  await expect(page.locator('#credit-en')).toHaveText('Made with AI-assisted development');
  await expect(page.locator('#ownerCredit')).toHaveText('© 2026 Ayub Azizi — Creator & owner of Happy Toons Studio');
  await expect(page.locator('meta[name="author"]')).toHaveAttribute('content', 'Ayub Azizi');
  const touch = await page.evaluate(async () => {
    const css = getComputedStyle(document.documentElement);
    const canvas = getComputedStyle(document.querySelector('canvas'));
    const sheet = await (await fetch(document.querySelector('link[rel="stylesheet"]').href)).text();
    return {
      html: css.touchAction,
      select: sheet.includes('user-select: none') && sheet.includes('-webkit-user-select: none'),
      callout: sheet.includes('-webkit-touch-callout: none'),
    };
  });
  expect(touch.html).toBe('none');
  expect(touch.select).toBe(true);
  expect(touch.callout).toBe(true);
});

test('the paddle matches the pointer on the next frame', async ({ page }) => {
  await boot(page);
  await page.click('#play');
  await page.waitForFunction(() => document.body.dataset.phase === 'play');
  const result = await page.evaluate(() => new Promise((resolve) => {
    const canvas = document.querySelector('#game');
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + rect.width * 0.62;
    const clientY = rect.top + rect.height * 0.58;
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      pointerId: 4,
      pointerType: 'touch',
      isPrimary: true,
      buttons: 1,
    }));
    requestAnimationFrame(() => {
      const lat = window.__PB.latency();
      resolve({
        lag: lat ? lat.lag : null,
        paddle: window.__PB.get().paddles[0].x,
        expected: lat ? lat.expectedX : null,
      });
    });
  }));
  console.log('paddle same-frame lag ms', result.lag, 'error', Math.abs(result.paddle - result.expected));
  expect(Math.abs(result.paddle - result.expected)).toBeLessThan(0.02);
  expect(result.lag).toBeGreaterThanOrEqual(0);
  expect(result.lag).toBeLessThan(120);
});

test('two touches stay on their own paddles', async ({ page }) => {
  await boot(page);
  await page.click('[data-mode="local"]');
  await page.click('#play');
  await page.waitForTimeout(200);
  const both = await page.evaluate(() => new Promise((resolve) => {
    const canvas = document.querySelector('#game');
    const rect = canvas.getBoundingClientRect();
    const left = { x: rect.left + rect.width * 0.28, y: rect.top + rect.height * 0.72 };
    const right = { x: rect.left + rect.width * 0.72, y: rect.top + rect.height * 0.28 };
    const opts = { bubbles: true, cancelable: true, pointerType: 'touch', buttons: 1, isPrimary: false };
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: left.x, clientY: left.y, pointerId: 11 }));
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: right.x, clientY: right.y, pointerId: 12 }));
    requestAnimationFrame(() => {
      const state = window.__PB.get();
      resolve({
        p0: state.paddles[0].x,
        p1: state.paddles[1].x,
        e0: window.__PB.worldFromClient(left.x, left.y).x,
        e1: window.__PB.worldFromClient(right.x, right.y).x,
      });
    });
  }));
  expect(Math.abs(both.p0 - both.e0)).toBeLessThan(0.05);
  expect(Math.abs(both.p1 - both.e1)).toBeLessThan(0.05);
  expect(Math.abs(both.p0 - both.p1)).toBeGreaterThan(0.4);
});
