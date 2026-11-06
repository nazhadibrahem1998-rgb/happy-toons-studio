import { expect, test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const qa = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qa');

function watch(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

function assertClean(errors) {
  const relevant = errors.filter((line) => !/favicon/i.test(line));
  expect(relevant, relevant.join('\n')).toEqual([]);
}

async function openGame(page) {
  const errors = watch(page);
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__PB);
  return errors;
}

test('menu draws a court with no characters', async ({ page }, info) => {
  const errors = await openGame(page);
  await expect(page).toHaveTitle(/Paddle Ball/);
  await expect(page.locator('#title')).toHaveText('Paddle Ball');
  await expect(page.locator('#credit-en')).toHaveText('Made with AI-assisted development');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('viewport-fit=cover');
  const touchAction = await page.evaluate(() => getComputedStyle(document.documentElement).touchAction);
  expect(touchAction).toBe('none');
  const box = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(box.sw).toBeLessThanOrEqual(box.cw + 1);
  const pixels = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let n = 0;
    for (let i = 0; i < data.length; i += 64) {
      if (data[i] + data[i + 1] + data[i + 2] > 30) n += 1;
    }
    return n;
  });
  expect(pixels).toBeGreaterThan(80);
  await page.screenshot({ path: path.join(qa, `${info.project.name}-menu.png`) });
  assertClean(errors);
});

test('play starts in this orientation and the paddle can move', async ({ page }, info) => {
  const errors = await openGame(page);
  await page.click('#play');
  await page.waitForFunction(() => document.body.dataset.phase === 'play');
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#games0')).toHaveText('0');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(qa, `${info.project.name}-play.png`) });

  if (info.project.name === 'desktop') {
    const before = await page.evaluate(() => window.__PB.get().paddles[0].x);
    await page.keyboard.down('d');
    await page.waitForTimeout(350);
    await page.keyboard.up('d');
    const after = await page.evaluate(() => window.__PB.get().paddles[0].x);
    expect(after).toBeGreaterThan(before + 0.3);
    await page.keyboard.press('p');
    await expect(page.locator('#pause')).toBeVisible();
    await page.locator('#pause [data-lang="ckb"]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('#pause-title')).toHaveText('وەستاوە');
    await expect(page.locator('#credit-en')).toHaveText('Made with AI-assisted development');
    await page.screenshot({ path: path.join(qa, 'desktop-kurdish.png') });
    await page.locator('#pause [data-lang="en"]').click();
    await page.click('#btn-menu');
    await page.click('[data-mode="local"]');
    await expect(page.locator('#diff-row')).toBeHidden();
  }

  if (info.project.name.startsWith('iphone')) {
    await expect(page.locator('#touch')).toBeVisible();
    const shape = await page.evaluate(() => ({
      w: window.innerWidth,
      h: window.innerHeight,
      sw: document.documentElement.scrollWidth,
      portrait: window.__PB.get().portrait,
    }));
    expect(shape.sw).toBeLessThanOrEqual(shape.w + 1);
    if (info.project.name.endsWith('portrait')) expect(shape.h).toBeGreaterThan(shape.w);
    if (info.project.name.endsWith('landscape')) expect(shape.w).toBeGreaterThan(shape.h);
    expect(shape.portrait).toBe(shape.h >= shape.w);
    const box = await page.locator('.half').first().boundingBox();
    expect(box.width).toBeGreaterThan(40);
    expect(box.height).toBeGreaterThan(40);
  }

  assertClean(errors);
});
