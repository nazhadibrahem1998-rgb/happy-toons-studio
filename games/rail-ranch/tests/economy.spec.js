import { expect, test } from '@playwright/test';

async function fresh(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/games/rail-ranch/');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.RR);
  await page.evaluate(() => RR.wipe());
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.RR);
  return errors;
}

test('a 15 minute bot keeps buying and never prints infinite cash', async ({ page }) => {
  const errors = await fresh(page);
  const report = await page.evaluate(() => {
    const played = RR.autoplay(15 * 60);
    const data = JSON.parse(localStorage.getItem('rail-ranch-v1'));
    data.wall = Date.now() + 60000;
    localStorage.setItem('rail-ranch-v1', JSON.stringify(data));
    RR.hold();
    return played;
  });
  expect(report.firstBuyAt).toBeLessThan(15);
  expect(report.end.lifetime).toBeGreaterThan(2500);
  expect(report.end.lifetime).toBeLessThan(250000);
  expect(report.maxGap).toBeLessThan(180);
  expect(report.buyCount).toBeGreaterThan(8);
  expect(report.buys.some((b) => b.t >= 60)).toBe(true);
  expect(report.buys.some((b) => b.t >= 300)).toBe(true);
  expect(report.buys.some((b) => b.t >= 600)).toBe(true);
  expect(report.end.prestige).toBe(0);
  expect(report.end.ownedCount).toBeGreaterThanOrEqual(3);
  expect(report.end.track).toBeGreaterThanOrEqual(1);
  expect(Number.isFinite(report.end.cash)).toBe(true);
  expect(Number.isFinite(report.end.lifetime)).toBe(true);

  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.RR);
  const loaded = await page.evaluate(() => RR.summary());
  expect(loaded.cash).toBe(report.end.cash);
  expect(loaded.wagons).toBe(report.end.wagons);
  expect(loaded.track).toBe(report.end.track);
  expect(loaded.ownedCount).toBe(report.end.ownedCount);
  const best = await page.evaluate(() => Number(localStorage.getItem('hts:best:rail-ranch')));
  expect(best).toBeGreaterThan(1000);
  expect(errors.filter((line) => !/favicon/i.test(line))).toEqual([]);
});

test('offline earnings survive a reload and cap at two hours', async ({ page }) => {
  const errors = await fresh(page);
  const raw = await page.evaluate(() => {
    RR.autoplay(75);
    RR.hold();
    return localStorage.getItem('rail-ranch-v1');
  });
  const baseCash = JSON.parse(raw).cash;

  async function boot(msAgo) {
    await page.evaluate(({ raw, msAgo }) => {
      const data = JSON.parse(raw);
      data.wall = Date.now() - msAgo;
      localStorage.setItem('rail-ranch-v1', JSON.stringify(data));
      RR.hold();
    }, { raw, msAgo });
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.ready === '1' && window.RR);
    return page.evaluate(() => RR.summary());
  }

  const halfHour = await boot(30 * 60 * 1000);
  const twoHours = await boot(2 * 60 * 60 * 1000);
  const fiveHours = await boot(5 * 60 * 60 * 1000);
  expect(halfHour.lastOffline).toBeGreaterThan(0);
  expect(halfHour.cash).toBeGreaterThan(baseCash);
  expect(twoHours.lastOffline).toBe(fiveHours.lastOffline);
  expect(halfHour.lastOffline).toBeLessThan(twoHours.lastOffline);
  expect(Math.abs(halfHour.lastOffline * 4 - twoHours.lastOffline) / twoHours.lastOffline).toBeLessThan(0.08);
  expect(errors.filter((line) => !/favicon/i.test(line))).toEqual([]);
});
