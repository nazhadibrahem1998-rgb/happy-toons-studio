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
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__PB);
  return bag;
}

test('a match starts with no outside requests', async ({ page }, info) => {
  const bag = await openReady(page);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('viewport-fit=cover');
  expect(viewport).toContain('user-scalable=no');
  const css = await page.locator('link[rel="stylesheet"]').getAttribute('href');
  const sheet = await page.evaluate(async (href) => (await fetch(href)).text(), css);
  expect(sheet).toContain('env(safe-area-inset-top)');
  await page.click('#play');
  await page.waitForFunction(() => document.body.dataset.phase === 'play');
  await noScroll(page);
  if (info.project.name === 'desktop') await page.screenshot({ path: path.join(qa, 'after-desktop.png') });
  if (info.project.name === 'iphone-landscape') await page.screenshot({ path: path.join(qa, 'after-iphone.png') });
  assertClean(bag);
});

test('keyboard, pause, and restart', async ({ page }) => {
  const bag = await openReady(page);
  await page.click('[data-mode="local"]');
  await page.click('#play');
  const a = await page.evaluate(() => window.__PB.get().paddles[0].x);
  await page.keyboard.down('d');
  await page.waitForTimeout(280);
  await page.keyboard.up('d');
  const b = await page.evaluate(() => window.__PB.get().paddles[0].x);
  expect(b).toBeGreaterThan(a + 0.25);
  const c = await page.evaluate(() => window.__PB.get().paddles[1].x);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(280);
  await page.keyboard.up('ArrowLeft');
  const d = await page.evaluate(() => window.__PB.get().paddles[1].x);
  expect(d).toBeLessThan(c - 0.2);

  await page.keyboard.press('p');
  await expect(page.locator('#pause')).toBeVisible();
  const ball = await page.evaluate(() => window.__PB.get().ball);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__PB.get().ball)).toEqual(ball);
  await page.click('#btn-resume');
  await page.keyboard.press('p');
  await page.evaluate(() => window.__PB.award(0));
  await page.click('#btn-restart');
  await expect.poll(() => page.evaluate(() => window.__PB.get().points.join(','))).toBe('0,0');
  assertClean(bag);
});

test('mouse drags the near paddle', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop' && info.project.name !== 'desktop-1080', 'mouse on desktop');
  const bag = await openReady(page);
  await page.click('#play');
  const before = await page.evaluate(() => window.__PB.get().paddles[0].x);
  await page.mouse.move(200, 400);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.__PB.get().paddles[0].x);
  expect(after).not.toBeCloseTo(before, 1);
  assertClean(bag);
});

test('Kurdish is RTL, unclipped, and remembered', async ({ page }) => {
  const bag = await openReady(page);
  await page.click('#lang-ckb');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#title')).toContainText('تۆپی پەدل');
  await noClippedControls(page);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#title')).toContainText('تۆپی پەدل');
  assertClean(bag);
});

test('touch drags both paddles in two-player mode', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('iphone') && info.project.name !== 'android', 'touch projects only');
  const bag = await openReady(page);
  await page.click('[data-mode="local"]');
  await page.click('#play');
  await expect(page.locator('#touch')).toBeVisible();
  const portrait = (await page.viewportSize()).height > (await page.viewportSize()).width;
  const near = await page.locator('.half[data-zone="0"]').boundingBox();
  const far = await page.locator('.half[data-zone="1"]').boundingBox();
  const x0 = await page.evaluate(() => window.__PB.get().paddles[0].x);
  if (portrait) {
    await page.mouse.move(near.x + 24, near.y + near.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(near.x + near.width - 24, near.y + near.height * 0.5);
  } else {
    await page.mouse.move(near.x + near.width * 0.5, near.y + near.height - 24);
    await page.mouse.down();
    await page.mouse.move(near.x + near.width * 0.5, near.y + 24);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const x1 = await page.evaluate(() => window.__PB.get().paddles[0].x);
  expect(x1).toBeGreaterThan(x0 + 0.4);

  const y0 = await page.evaluate(() => window.__PB.get().paddles[1].x);
  if (portrait) {
    await page.mouse.move(far.x + far.width - 24, far.y + far.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(far.x + 24, far.y + far.height * 0.5);
  } else {
    await page.mouse.move(far.x + far.width * 0.5, far.y + 24);
    await page.mouse.down();
    await page.mouse.move(far.x + far.width * 0.5, far.y + far.height - 24);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const y1 = await page.evaluate(() => window.__PB.get().paddles[1].x);
  expect(y1).toBeLessThan(y0 - 0.3);
  await noScroll(page);
  assertClean(bag);
});

test('orientation can change during a rally', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop' || info.project.name === 'desktop-1080', 'mobile viewports');
  const bag = await openReady(page);
  await page.click('#play');
  const size = page.viewportSize();
  const current = await size;
  const next = current.height > current.width
    ? { width: 844, height: 390 }
    : { width: 390, height: 844 };
  await page.setViewportSize(next);
  await page.waitForTimeout(300);
  const view = await page.evaluate(() => window.__PB.get());
  expect(view.phase).toBe('play');
  expect(view.portrait).toBe(next.height >= next.width);
  for (const paddle of view.paddles) {
    expect(paddle.x).toBeGreaterThan(0.8);
    expect(paddle.x).toBeLessThan(9.2);
  }
  await noScroll(page);
  assertClean(bag);
});

test('win screen can play again or return to the menu', async ({ page }) => {
  const bag = await openReady(page);
  await page.click('[data-len="7"]');
  await page.click('#play');
  await page.evaluate(() => {
    for (let i = 0; i < 12 && window.__PB.get().stage !== 'match'; i++) window.__PB.award(0);
  });
  await expect(page.locator('#match')).toBeVisible();
  await page.click('#btn-again');
  await expect(page.locator('#match')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__PB.get().points.join(','))).toBe('0,0');
  await page.evaluate(() => {
    for (let i = 0; i < 12 && window.__PB.get().stage !== 'match'; i++) window.__PB.award(1);
  });
  await page.click('#btn-match-menu');
  await expect(page.locator('#menu')).toBeVisible();
  assertClean(bag);
});

test('the match clock tracks real time', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one timing sample');
  const bag = await openReady(page);
  await page.click('#play');
  const start = await page.evaluate(() => window.__PB.get().time);
  await page.waitForTimeout(1000);
  const end = await page.evaluate(() => window.__PB.get().time);
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
