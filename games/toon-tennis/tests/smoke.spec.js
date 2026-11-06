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
  const relevant = errors.filter((line) => !/favicon|net::ERR_BLOCKED/i.test(line));
  expect(relevant, relevant.join('\n')).toEqual([]);
}

async function openGame(page) {
  const errors = watch(page);
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__TT);
  return errors;
}

test('menu draws, credits the studio, and does not overflow', async ({ page }, info) => {
  const errors = await openGame(page);
  await expect(page).toHaveTitle(/Toon Tennis/);
  await expect(page.locator('#title')).toContainText('Toon Tennis');
  await expect(page.locator('#credit-en')).toHaveText('Made with AI-assisted development');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('viewport-fit=cover');
  expect(viewport).toContain('user-scalable=no');
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
      if (data[i] + data[i + 1] + data[i + 2] > 40) n += 1;
    }
    return n;
  });
  expect(pixels).toBeGreaterThan(80);
  await page.screenshot({ path: path.join(qa, `${info.project.name}-menu.png`) });
  assertClean(errors);
});

test('a match starts, keyboard and pause work, language can switch', async ({ page }, info) => {
  const errors = await openGame(page);
  await page.click('#play');
  await page.waitForFunction(() => document.body.dataset.phase === 'play');
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#pts')).toContainText('0');
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(qa, `${info.project.name}-play.png`) });

  if (info.project.name === 'desktop') {
    const before = await page.evaluate(() => window.__TT.get().players[0].x);
    await page.keyboard.down('d');
    await page.waitForTimeout(350);
    await page.keyboard.up('d');
    const after = await page.evaluate(() => window.__TT.get().players[0].x);
    expect(after).toBeGreaterThan(before + 0.3);

    await page.keyboard.press('p');
    await expect(page.locator('#pause')).toBeVisible();
    await page.screenshot({ path: path.join(qa, 'desktop-pause.png') });

    await page.locator('#pause [data-lang="ckb"]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ckb');
    await expect(page.locator('#pause-title')).toHaveText('وەستاوە');
    await expect(page.locator('#credit-en')).toHaveText('Made with AI-assisted development');
    await expect(page.locator('#hud')).toHaveAttribute('dir', 'ltr');
    await page.screenshot({ path: path.join(qa, 'desktop-kurdish.png') });
    await page.locator('#pause [data-lang="en"]').click();
    await page.click('#btn-menu');
    await expect(page.locator('#menu')).toBeVisible();
    await page.click('[data-mode="local"]');
    await expect(page.locator('#diff-row')).toBeHidden();
    await page.click('[data-mode="cpu"]');
    await expect(page.locator('#diff-row')).toBeVisible();
  }

  if (info.project.name === 'iphone') {
    await expect(page.locator('#touch')).toBeVisible();
    await expect(page.locator('#rotate')).toBeHidden();
    await expect(page.locator('.hitbtn').first()).toBeVisible();
    const safe = await page.evaluate(() => getComputedStyle(document.getElementById('hud')).top);
    expect(safe).toBeTruthy();
    await page.locator('.hitbtn').first().tap();
    const view = await page.evaluate(() => ({
      w: window.innerWidth,
      h: window.innerHeight,
      sw: document.documentElement.scrollWidth,
    }));
    expect(view.w).toBeGreaterThan(view.h);
    expect(view.sw).toBeLessThanOrEqual(view.w + 1);
  }

  assertClean(errors);
});
