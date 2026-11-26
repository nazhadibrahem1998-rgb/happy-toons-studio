import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { decide } from './policy.js';

const shots = '/opt/cursor/artifacts';

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

async function open(page) {
  const bag = watch(page);
  await page.goto('/index.html');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__VR);
  return bag;
}

async function start(page) {
  await page.locator('#btn-start').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'play');
}

test.beforeAll(() => {
  fs.mkdirSync(shots, { recursive: true });
});

test('title screen is quiet and landscape-ready', async ({ page }, info) => {
  const bag = await open(page);
  await expect(page.locator('#screen-title h1')).toContainText('VESPER');
  await expect(page.locator('#rotate')).toBeHidden();
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('viewport-fit=cover');
  expect(viewport).toContain('user-scalable=no');
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: path.join(shots, 'vesper-run-title.png') });
  }
  assertClean(bag);
});

test('keyboard moves and jumps', async ({ page }, info) => {
  const bag = await open(page);
  await start(page);
  await page.waitForTimeout(250);
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: path.join(shots, 'vesper-run-desktop.png') });
  }
  if (info.project.name === 'iphone-landscape') {
    await expect(page.locator('#touch')).toBeVisible();
    await page.screenshot({ path: path.join(shots, 'vesper-run-phone.png') });
  }
  const x0 = await page.evaluate(() => window.__VR.state().player.x);
  const y0 = await page.evaluate(() => window.__VR.state().player.y);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction((startX) => window.__VR.state().player.x > startX + 24, x0);
  await page.keyboard.up('ArrowRight');
  const x1 = await page.evaluate(() => window.__VR.state().player.x);
  await page.keyboard.down('KeyD');
  await page.waitForFunction((startX) => window.__VR.state().player.x > startX + 16, x1);
  await page.keyboard.up('KeyD');
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.keyboard.down('Space');
  await page.waitForFunction((startY) => {
    const p = window.__VR.state().player;
    return p.vy < -150 || p.y < startY - 8;
  }, y0);
  await page.keyboard.up('Space');
  await page.keyboard.down('KeyZ');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyZ');
  assertClean(bag);
});

test('collects a shard and stomps a skitter', async ({ page }) => {
  const bag = await open(page);
  await start(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__VR.state().shards >= 1);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__VR.state().shards)).toBeGreaterThan(0);

  await page.keyboard.down('Shift');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => {
    const s = window.__VR.state();
    const enemy = s.enemies.find((e) => e.alive);
    if (!enemy) return true;
    if (s.player.invuln > 0) return false;
    const dx = enemy.x - (s.player.x + s.player.w);
    if (dx < 66 && dx > 38 && s.player.grounded) {
      window.__VR.queueJump(4);
      return true;
    }
    return false;
  });
  await page.waitForFunction(() => window.__VR.state().enemies.some((e) => !e.alive));
  expect(await page.evaluate(() => window.__VR.state().score)).toBeGreaterThanOrEqual(250);
  await page.keyboard.up('Shift');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('Space');
  assertClean(bag);
});

test('contact with a skitter spends a charge and respawns', async ({ page }) => {
  const bag = await open(page);
  await start(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__VR.state().deaths >= 1);
  await page.keyboard.up('ArrowRight');
  const after = await page.evaluate(() => window.__VR.state());
  expect(after.lives).toBe(5);
  expect(after.player.x).toBeLessThan(200);
  expect(after.phase).toBe('play');
  assertClean(bag);
});

test('a full circuit reaches the clear screen and stores a best score', async ({ page }, info) => {
  const bag = await open(page);
  await start(page);
  await page.evaluate((src) => {
    window.__hold = { t: 0 };
    const run = new Function('sensors', 'player', `${src}\nreturn decide(sensors, window.__hold, player);`);
    window.__VR_DRIVER = run;
  }, decide.toString());
  await page.waitForFunction(() => {
    const phase = document.body.dataset.phase;
    return window.__VR.state().player.x > 1100 || phase === 'clear' || phase === 'over';
  }, null, { timeout: 20000 });
  if (info.project.name === 'desktop' && await page.evaluate(() => document.body.dataset.phase === 'play')) {
    await page.screenshot({ path: path.join(shots, 'vesper-run-action.png') });
  }
  await page.waitForFunction(() => {
    const phase = document.body.dataset.phase;
    return phase === 'clear' || phase === 'over' || phase === 'victory';
  }, null, { timeout: 45000 });
  const phase = await page.evaluate(() => document.body.dataset.phase);
  expect(phase, await page.evaluate(() => JSON.stringify(window.__VR.state()))).toBe('clear');
  await expect(page.locator('#screen-clear')).toBeVisible();
  const best = await page.evaluate(() => Number(localStorage.getItem('vesper-run-best')));
  const score = await page.evaluate(() => window.__VR.state().score);
  expect(score).toBeGreaterThan(0);
  expect(best).toBeGreaterThan(0);
  expect(best).toBeGreaterThanOrEqual(score);
  assertClean(bag);
});

test('touch buttons stay put, stack, and release when a finger slides off', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone-landscape', 'touch layout');
  const bag = await open(page);
  await start(page);
  const buttons = ['left', 'right', 'jump', 'run'];
  for (const act of buttons) {
    const box = await page.locator(`[data-act="${act}"]`).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(56);
    expect(box.height).toBeGreaterThanOrEqual(56);
    const inside = await page.evaluate((name) => {
      const r = document.querySelector(`[data-act="${name}"]`).getBoundingClientRect();
      return r.left >= -1 && r.top >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1;
    }, act);
    expect(inside).toBe(true);
  }
  await page.evaluate(() => {
    const run = document.querySelector('[data-act="run"]').getBoundingClientRect();
    const jump = document.querySelector('[data-act="jump"]').getBoundingClientRect();
    const fire = (type, id, x, y, target) => {
      target.dispatchEvent(new PointerEvent(type, {
        pointerId: id,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        pointerType: 'touch',
      }));
    };
    window.__fire = fire;
    fire('pointerdown', 3, run.left + 12, run.top + 12, document.querySelector('[data-act="run"]'));
    fire('pointerdown', 4, jump.left + 12, jump.top + 12, document.querySelector('[data-act="jump"]'));
  });
  await page.waitForFunction(() => {
    const i = window.__VR.input();
    return i.run && i.jump;
  });
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: 3,
      clientX: 2,
      clientY: 2,
      bubbles: true,
      pointerType: 'touch',
    }));
  });
  await page.waitForFunction(() => {
    const i = window.__VR.input();
    return i.run === false && i.jump === true;
  });
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerup', {
      pointerId: 4,
      bubbles: true,
      pointerType: 'touch',
    }));
    window.dispatchEvent(new PointerEvent('pointercancel', {
      pointerId: 9,
      bubbles: true,
      pointerType: 'touch',
    }));
  });
  await page.waitForFunction(() => window.__VR.input().jump === false && window.__VR.input().run === false);
  assertClean(bag);
});
