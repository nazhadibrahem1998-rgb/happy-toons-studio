import { expect, test } from '@playwright/test';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__TT);
}

test('English stays the default and the owner credit is on the menu', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('toon-tennis-settings', JSON.stringify({ lang: 'ckb', sound: true }));
  });
  await boot(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle(/Toon Tennis/);
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

test('the player matches the pointer on the next frame', async ({ page }) => {
  await boot(page);
  await page.click('#play');
  await page.waitForFunction(() => document.body.dataset.phase === 'play');
  const result = await page.evaluate(() => new Promise((resolve) => {
    const canvas = document.querySelector('#game');
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + rect.width * 0.32;
    const clientY = rect.top + rect.height * 0.62;
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
      const lat = window.__TT.latency();
      const player = window.__TT.get().players[0];
      resolve({
        lag: lat ? lat.lag : null,
        x: player.x,
        z: player.z,
        expectedX: lat ? lat.expectedX : null,
        expectedZ: lat ? lat.expectedZ : null,
      });
    });
  }));
  console.log('tennis same-frame lag ms', result.lag, 'error', Math.abs(result.x - result.expectedX));
  expect(Math.abs(result.x - result.expectedX)).toBeLessThan(0.02);
  expect(Math.abs(result.z - result.expectedZ)).toBeLessThan(0.02);
  expect(result.lag).toBeGreaterThanOrEqual(0);
  expect(result.lag).toBeLessThan(120);
});

test('two touches stay on their own players', async ({ page }) => {
  await boot(page);
  await page.click('[data-mode="local"]');
  await page.click('#play');
  await page.waitForTimeout(200);
  const both = await page.evaluate(() => new Promise((resolve) => {
    const canvas = document.querySelector('#game');
    const rect = canvas.getBoundingClientRect();
    const left = { x: rect.left + rect.width * 0.28, y: rect.top + rect.height * 0.7 };
    const right = { x: rect.left + rect.width * 0.72, y: rect.top + rect.height * 0.42 };
    const opts = { bubbles: true, cancelable: true, pointerType: 'touch', buttons: 1, isPrimary: false };
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: left.x, clientY: left.y, pointerId: 11 }));
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: right.x, clientY: right.y, pointerId: 12 }));
    requestAnimationFrame(() => {
      const state = window.__TT.get();
      const e0 = window.__TT.worldFromClient(left.x, left.y, 0);
      const e1 = window.__TT.worldFromClient(right.x, right.y, 1);
      resolve({
        p0: state.players[0],
        p1: state.players[1],
        e0,
        e1,
      });
    });
  }));
  expect(Math.abs(both.p0.x - both.e0.x)).toBeLessThan(0.12);
  expect(Math.abs(both.p0.z - both.e0.z)).toBeLessThan(0.12);
  expect(Math.abs(both.p1.x - both.e1.x)).toBeLessThan(0.12);
  expect(Math.abs(both.p1.z - both.e1.z)).toBeLessThan(0.12);
  expect(Math.abs(both.p0.x - both.p1.x) + Math.abs(both.p0.z - both.p1.z)).toBeGreaterThan(0.4);
});
