import { expect, test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const qa = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qa');

function watch(page) {
  const errors = [];
  const external = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('http://127.0.0.1') && !url.startsWith('data:')) external.push(url);
  });
  return { errors, external };
}

function assertClean(bag) {
  expect(bag.external, bag.external.join('\n')).toEqual([]);
  const relevant = bag.errors.filter((line) => !/favicon/i.test(line));
  expect(relevant, relevant.join('\n')).toEqual([]);
}

async function noScroll(page) {
  const box = await page.evaluate(() => ({
    sy: window.scrollY,
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    touch: getComputedStyle(document.documentElement).touchAction,
  }));
  expect(box.sy).toBe(0);
  expect(box.sw).toBeLessThanOrEqual(box.cw + 1);
  expect(box.touch).toBe('none');
}

async function noClippedControls(page) {
  const clipped = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('button, h1, .scoreline, #banner, .credit')];
    return nodes.filter((node) => {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = node.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      const visible = rect.bottom > 4 && rect.top < window.innerHeight - 4;
      if (!visible) return false;
      return node.scrollWidth > node.clientWidth + 8;
    }).map((node) => (node.innerText || node.id || '').slice(0, 40));
  });
  expect(clipped, clipped.join(' | ')).toEqual([]);
}

async function openReady(page) {
  const bag = watch(page);
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__TT);
  return bag;
}

test('portrait does not block the menu, and a match can start', async ({ page }, info) => {
  const bag = await openReady(page);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('viewport-fit=cover');
  expect(viewport).toContain('user-scalable=no');
  const css = await page.locator('link[rel="stylesheet"]').getAttribute('href');
  const sheet = await page.evaluate(async (href) => (await fetch(href)).text(), css);
  expect(sheet).toContain('env(safe-area-inset-top)');
  expect(sheet).toContain('env(safe-area-inset-bottom)');
  await page.click('#play');
  await page.waitForFunction(() => document.body.dataset.phase === 'play');
  await noScroll(page);
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: path.join(qa, 'after-desktop.png') });
  }
  if (info.project.name === 'iphone') {
    await page.screenshot({ path: path.join(qa, 'after-iphone.png') });
  }
  assertClean(bag);
});

test('keyboard, mouse, pause, restart, and both players', async ({ page }) => {
  const bag = await openReady(page);
  await page.click('[data-mode="local"]');
  await page.click('#play');
  await page.waitForFunction(() => window.__TT.get().mode === 'local');

  const p1before = await page.evaluate(() => window.__TT.get().players[0].x);
  await page.keyboard.down('d');
  await page.waitForTimeout(280);
  await page.keyboard.up('d');
  const p1after = await page.evaluate(() => window.__TT.get().players[0].x);
  expect(p1after).toBeGreaterThan(p1before + 0.25);

  const p2before = await page.evaluate(() => window.__TT.get().players[1].z);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(280);
  await page.keyboard.up('ArrowUp');
  const p2after = await page.evaluate(() => window.__TT.get().players[1].z);
  expect(p2after).toBeGreaterThan(p2before + 0.2);

  if (!(await page.locator('#touch').isVisible())) {
    const canvas = await page.locator('#game').boundingBox();
    const beforeMouse = await page.evaluate(() => window.__TT.get().players[0].z);
    await page.mouse.move(canvas.x + canvas.width * 0.2, canvas.y + canvas.height * 0.72);
    await page.waitForTimeout(200);
    await page.mouse.move(canvas.x + canvas.width * 0.2, canvas.y + canvas.height * 0.28);
    await page.waitForTimeout(350);
    const afterMouse = await page.evaluate(() => window.__TT.get().players[0].z);
    expect(Math.abs(afterMouse - beforeMouse)).toBeGreaterThan(0.15);
  }

  await page.keyboard.press('p');
  await expect(page.locator('#pause')).toBeVisible();
  const ball = await page.evaluate(() => window.__TT.get().ball);
  await page.waitForTimeout(300);
  const held = await page.evaluate(() => window.__TT.get().ball);
  expect(held).toEqual(ball);
  await page.click('#btn-resume');
  await expect(page.locator('#pause')).toBeHidden();
  await page.keyboard.press('p');
  await page.click('#btn-restart');
  await expect.poll(() => page.evaluate(() => window.__TT.get().points.join(','))).toBe('0,0');
  await expect.poll(() => page.evaluate(() => window.__TT.get().phase)).toBe('play');
  assertClean(bag);
});

test('Kurdish is RTL, unclipped, and remembered', async ({ page }) => {
  const bag = await openReady(page);
  await page.click('#lang-ckb');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ckb');
  await expect(page.locator('#title')).toContainText('تێنسی توون');
  await noClippedControls(page);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#title')).toContainText('تێنسی توون');
  await page.click('#play');
  await page.keyboard.press('p');
  await noClippedControls(page);
  assertClean(bag);
});

test('touch moves both sides in a two-player game', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('iphone') && info.project.name !== 'android', 'touch projects only');
  const bag = await openReady(page);
  await page.click('[data-mode="local"]');
  await page.click('#play');
  await expect(page.locator('#touch')).toBeVisible();
  const left = await page.locator('.half[data-zone="0"]').boundingBox();
  const right = await page.locator('.half[data-zone="1"]').boundingBox();
  async function releaseAt(box, across, down, who) {
    const point = { x: box.x + box.width * across, y: box.y + box.height * down };
    const start = await page.evaluate((index) => window.__TT.get().players[index], who);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(150);
    const landed = await page.evaluate(({ x, y, index }) => {
      const player = window.__TT.get().players[index];
      const expected = window.__TT.worldFromClient(x, y, index);
      return { player, expected };
    }, { ...point, index: who });
    expect(Math.abs(landed.player.x - landed.expected.x)).toBeLessThan(0.15);
    expect(Math.abs(landed.player.z - landed.expected.z)).toBeLessThan(0.15);
    const moved = Math.hypot(landed.player.x - start.x, landed.player.z - start.z);
    expect(moved).toBeGreaterThan(0.2);
  }
  await releaseAt(left, 0.78, 0.42, 0);
  await releaseAt(right, 0.35, 0.28, 1);
  await noScroll(page);
  assertClean(bag);
});

test('orientation can change during a point', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop' || info.project.name === 'desktop-1080', 'mobile viewports');
  const bag = await openReady(page);
  await page.click('#play');
  const wide = { width: 844, height: 390 };
  const tall = { width: 390, height: 844 };
  await page.setViewportSize(info.project.name.includes('portrait') ? wide : tall);
  await page.waitForTimeout(250);
  const view = await page.evaluate(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
    phase: document.body.dataset.phase,
    players: window.__TT.get().players,
  }));
  expect(view.phase).toBe('play');
  expect(view.w === 844 || view.w === 390 || view.w === 915).toBeTruthy();
  for (const player of view.players) {
    expect(player.x).toBeGreaterThan(0);
    expect(player.x).toBeLessThan(24);
    expect(player.z).toBeGreaterThan(0);
    expect(player.z).toBeLessThan(9);
  }
  await noScroll(page);
  assertClean(bag);
});

test('win screen can play again or return to the menu', async ({ page }) => {
  const bag = await openReady(page);
  await page.click('#play');
  await page.evaluate(() => {
    for (let i = 0; i < 30 && window.__TT.get().stage !== 'match'; i++) window.__TT.award(0);
  });
  await expect(page.locator('#match')).toBeVisible();
  await expect(page.locator('#match-title')).toContainText(/wins|بردیەوە/);
  await page.click('#btn-again');
  await expect(page.locator('#match')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__TT.get().games.join(','))).toBe('0,0');
  await page.evaluate(() => {
    for (let i = 0; i < 30 && window.__TT.get().stage !== 'match'; i++) window.__TT.award(1);
  });
  await page.click('#btn-match-menu');
  await expect(page.locator('#menu')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__TT.get().phase)).toBe('menu');
  assertClean(bag);
});

test('the match clock tracks real time', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one timing sample');
  const bag = await openReady(page);
  await page.click('#play');
  const start = await page.evaluate(() => window.__TT.get().time);
  await page.waitForTimeout(1000);
  const end = await page.evaluate(() => window.__TT.get().time);
  expect(end - start).toBeGreaterThan(0.65);
  expect(end - start).toBeLessThan(1.8);
  assertClean(bag);
});

test('heap does not grow across five minutes of play', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one five-minute sample');
  test.setTimeout(420000);
  const bag = await openReady(page);
  await page.click('#play');
  const session = await page.context().newCDPSession(page);
  async function heap() {
    await session.send('HeapProfiler.collectGarbage');
    const usage = await session.send('Runtime.getHeapUsage');
    return usage.usedSize;
  }
  const start = await heap();
  await page.waitForTimeout(5 * 60 * 1000);
  const end = await heap();
  expect(end - start).toBeLessThan(8 * 1024 * 1024);
  assertClean(bag);
});
