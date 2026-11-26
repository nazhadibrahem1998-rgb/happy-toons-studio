import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const shots = '/opt/cursor/artifacts';

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

async function fresh(page) {
  const errors = watch(page);
  await page.goto('/games/rail-ranch/');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.RR);
  await page.evaluate(() => RR.wipe());
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.RR);
  return errors;
}

async function tap(page, x, y, project) {
  if (project === 'iphone') await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

test('loads a portrait ranch without copying the ad name', async ({ page }) => {
  const errors = await fresh(page);
  await expect(page).toHaveTitle(/Rail Ranch/);
  await expect(page.locator('a.all')).toHaveAttribute('href', '../');
  await expect(page.locator('a.all')).toHaveText('All games');
  const html = (await page.content()).toLowerCase();
  expect(html).not.toContain('klondike');
  expect(html).not.toContain('made with ai');
  const touch = await page.evaluate(() => ({
    canvas: getComputedStyle(document.querySelector('canvas')).touchAction,
    body: getComputedStyle(document.body).touchAction,
    scroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  }));
  expect(touch.canvas).toBe('none');
  expect(touch.body).not.toBe('none');
  expect(touch.scroll).toBe(true);
  const hub = fs.readFileSync(path.join(root, 'games/index.html'), 'utf8');
  expect(hub).not.toContain('Rail Ranch');
  const cash = await page.locator('#cash').textContent();
  expect(Number(cash.replace(/,/g, ''))).toBeGreaterThan(0);
  assertClean(errors);
});

test('the train earns cash, a tap buys a plot, and drag pans', async ({ page }, info) => {
  const errors = await fresh(page);
  const before = await page.evaluate(() => RR.summary().lifetime);
  await page.waitForTimeout(8000);
  const after = await page.evaluate(() => RR.summary().lifetime);
  expect(after).toBeGreaterThan(before);

  await page.evaluate(() => {
    for (let i = 0; i < 30; i++) RR.step(0.5);
  });
  const spot = await page.evaluate(() => RR.screenPos('p:coop'));
  expect(spot).toBeTruthy();
  expect(spot.x).toBeGreaterThan(0);
  expect(spot.y).toBeGreaterThan(0);
  const owned = await page.evaluate(() => RR.summary().ownedCount);
  await tap(page, spot.x, spot.y, info.project.name);
  await expect.poll(() => page.evaluate(() => RR.summary().ownedCount)).toBeGreaterThan(owned);

  const cam0 = await page.evaluate(() => RR.cam());
  const box = await page.locator('#view').boundingBox();
  const x = box.x + box.width * 0.58;
  const y = box.y + box.height * 0.48;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 130, y + 16, { steps: 10 });
  await page.mouse.up();
  const cam1 = await page.evaluate(() => RR.cam());
  expect(cam1.x).toBeGreaterThan(cam0.x + 10);

  if (info.project.name === 'desktop') {
    const z0 = cam1.z;
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, -240);
    const z1 = await page.evaluate(() => RR.cam().z);
    expect(z1).toBeGreaterThan(z0);
  }
  assertClean(errors);
});

test('mute survives a reload', async ({ page }) => {
  const errors = await fresh(page);
  await page.locator('#mute').click();
  await expect(page.locator('#mute')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rail-ranch-mute'))).toBe('1');
  await page.evaluate(() => RR.hold());
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await expect(page.locator('#mute')).toHaveAttribute('aria-pressed', 'true');
  assertClean(errors);
});

test('pauses while the tab is hidden', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Chromium lifecycle only');
  const errors = await fresh(page);
  const life = await page.evaluate(() => RR.summary().lifetime);
  const client = await page.context().newCDPSession(page);
  await client.send('Page.setWebLifecycleState', { state: 'frozen' });
  await page.waitForTimeout(800);
  await client.send('Page.setWebLifecycleState', { state: 'active' });
  const again = await page.evaluate(() => RR.summary().lifetime);
  expect(again).toBe(life);
  assertClean(errors);
});

test('phone screenshots of the tutorial, a busy ranch, and upgrades', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'portrait shots only');
  const errors = await fresh(page);
  fs.mkdirSync(shots, { recursive: true });
  await page.waitForTimeout(500);
  const zoom = await page.evaluate(() => RR.cam().z);
  expect(zoom).toBeGreaterThan(1.2);
  await page.screenshot({ path: path.join(shots, 'rail-ranch-start.png') });
  await page.locator('#buildBtn').click();
  await page.locator('#buildList button').first().click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(shots, 'rail-ranch-build.png') });
  await page.locator('#buildCancel').click();
  await page.locator('#ordersBtn').click();
  await expect(page.locator('#orderList .order').first()).toBeVisible();
  await expect(page.locator('#orderList')).not.toContainText('undefined');
  await expect(page.locator('#orderList .order').first()).toContainText(/Milk|Eggs/);
  await page.screenshot({ path: path.join(shots, 'rail-ranch-orders.png') });
  await page.locator('#ordersClose').click();
  await page.evaluate(() => {
    RR.autoplay(240);
    for (let i = 0; i < 70; i++) {
      RR.step(0.35);
      if (RR.summary().maxStock >= 9) break;
    }
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(shots, 'rail-ranch-mid.png') });
  const barn = await page.evaluate(() => RR.screenPos('barn'));
  await page.touchscreen.tap(barn.x, barn.y);
  await expect(page.locator('#sheet')).toBeVisible();
  await expect(page.locator('#sheetTitle')).toHaveText('Red Barn');
  await page.screenshot({ path: path.join(shots, 'rail-ranch-upgrade.png') });
  await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    if (sheet) sheet.hidden = true;
    let pos = RR.trainPos();
    for (let i = 0; i < 90; i++) {
      const dx = pos.x - 620;
      const dy = pos.y - 340;
      if (Math.hypot(dx, dy) < 110 && RR.summary().maxStock >= 4) break;
      RR.step(0.2);
      pos = RR.trainPos();
    }
    RR.look(600, 390, 1.65);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shots, 'rail-ranch-close.png') });
  assertClean(errors);
});
