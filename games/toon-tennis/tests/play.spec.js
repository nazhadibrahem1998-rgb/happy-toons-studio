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

function relevant(errors) {
  return errors.filter((line) => !/favicon/i.test(line));
}

test('a served ball keeps moving and the point ends', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop' && info.project.name !== 'iphone', 'desktop and iPhone landscape');
  const errors = watch(page);
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await expect(page.locator('#ownerCredit')).toContainText('Ayub Azizi');
  await expect(page.locator('#credit-en')).toHaveText('Made with AI-assisted development');
  await page.click('#btn-credits');
  await expect(page.locator('#credits-body')).toContainText('No upstream project');
  await page.click('#btn-credits-close');
  await page.click('[data-diff="easy"]');
  await page.click('#play');
  await page.waitForFunction(() => document.body.dataset.phase === 'play');
  await page.keyboard.press('Space');
  const samples = [];
  for (let i = 0; i < 10; i += 1) {
    samples.push(await page.evaluate(() => {
      const ball = window.__TT.get().ball;
      return ball ? ball.x : null;
    }));
    await page.waitForTimeout(80);
  }
  const xs = samples.filter((value) => value != null);
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.35);
  await page.waitForFunction(() => {
    const state = window.__TT.get();
    return state.points[0] + state.points[1] > 0 || state.games[0] + state.games[1] > 0;
  }, null, { timeout: 12000 });
  expect(relevant(errors), relevant(errors).join('\n')).toEqual([]);
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: path.join(qa, 'rebuild-desktop.png') });
  }
  if (info.project.name === 'iphone') {
    await page.screenshot({ path: path.join(qa, 'rebuild-iphone.png') });
  }
});

test('a badly placed serve is called a fault', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard serve');
  const errors = watch(page);
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await page.click('[data-mode="local"]');
  await page.click('#play');
  await page.waitForFunction(() => window.__TT.get().stage === 'serve');
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  const moved = await page.evaluate(() => window.__TT.get().players[0].z);
  expect(moved).toBeGreaterThan(4);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const state = window.__TT.get();
    return state.message === 'fault' || state.message === 'out' || state.message === 'doublefault' || state.points[1] > 0;
  }, null, { timeout: 8000 });
  const state = await page.evaluate(() => window.__TT.get());
  expect(['fault', 'out', 'doublefault', 'point', '']).toContain(state.message);
  expect(state.points[1] + state.games[1] > 0 || state.message === 'fault' || state.message === 'out').toBe(true);
  expect(relevant(errors), relevant(errors).join('\n')).toEqual([]);
});

test('keyboard chasing scores a point against easy', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop chase');
  const errors = watch(page);
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await page.click('[data-diff="easy"]');
  await page.click('#play');
  const started = Date.now();
  let scored = false;
  while (Date.now() - started < 20000 && !scored) {
    const state = await page.evaluate(() => window.__TT.get());
    if (state.points[0] > 0 || state.games[0] > 0) {
      scored = true;
      break;
    }
    if (state.stage === 'serve' && state.server === 0) {
      await page.keyboard.press('Space');
    } else if (state.ball?.inPlay) {
      const me = state.players[0];
      const ball = state.ball;
      if (ball.z > me.z + 0.2) await page.keyboard.down('w');
      else await page.keyboard.up('w');
      if (ball.z < me.z - 0.2) await page.keyboard.down('s');
      else await page.keyboard.up('s');
      if (ball.x > me.x + 0.35) await page.keyboard.down('d');
      else await page.keyboard.up('d');
      if (ball.x < me.x - 0.1) await page.keyboard.down('a');
      else await page.keyboard.up('a');
      if (ball.x < 12 && ball.x > me.x && Math.abs(ball.z - me.z) < 1.6 && ball.y < 2.3 && ball.y > 0.2) {
        await page.keyboard.press('Space');
      }
    }
    await page.waitForTimeout(50);
  }
  await page.keyboard.up('w');
  await page.keyboard.up('a');
  await page.keyboard.up('s');
  await page.keyboard.up('d');
  const end = await page.evaluate(() => window.__TT.get());
  expect(end.points[0] + end.games[0]).toBeGreaterThan(0);
  expect(relevant(errors), relevant(errors).join('\n')).toEqual([]);
});
