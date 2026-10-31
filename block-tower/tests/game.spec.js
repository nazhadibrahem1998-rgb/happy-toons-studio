import { test, expect } from '@playwright/test';

const ART = '/opt/cursor/artifacts';
const GAME = '/block-tower/?test=1';

function watch(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

async function openGame(page) {
  const errors = watch(page);
  await page.goto(GAME);
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__BT && window.__BT.ready);
  await page.waitForTimeout(250);
  return errors;
}

function assertClean(errors) {
  const relevant = errors.filter((line) => !/favicon|Download the React DevTools/i.test(line));
  expect(relevant, relevant.join('\n')).toEqual([]);
}

test('menu, move, jump, and no console errors', async ({ page }, info) => {
  const errors = await openGame(page);
  await expect(page.locator('h1')).toHaveText('بورجی خشت');
  await expect(page.locator('#footerCredit')).toHaveText('© 2026 Nazhad Ibrahem – Happy Toons Studio');
  await expect(page.locator('#aiNote')).toContainText('دروستکراو بە یارمەتی AI (کۆد و گرافیک)');
  await expect(page.locator('#aiNote')).toContainText('Made with AI assistance (code and graphics)');
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: `${ART}/screenshot_main_menu.png` });
  }
  await page.click('#playBtn');
  await page.waitForTimeout(150);
  const y0 = await page.evaluate(() => window.__BT.getState().y);
  await page.keyboard.down('Space');
  await page.waitForTimeout(180);
  await page.keyboard.up('Space');
  const y1 = await page.evaluate(() => window.__BT.getState().y);
  expect(y1).toBeGreaterThan(y0 + 0.35);
  const x0 = await page.evaluate(() => window.__BT.getState().x);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyW');
  const x1 = await page.evaluate(() => window.__BT.getState().x);
  expect(x1).toBeGreaterThan(x0 + 0.4);
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: `${ART}/screenshot_gameplay_desktop.png` });
  }
  if (info.project.name === 'iphone') {
    await page.screenshot({ path: `${ART}/screenshot_gameplay_mobile.png` });
  }
  assertClean(errors);
});

test('scripted run clears floors 1–3, respawns, and can finish', async ({ page }, info) => {
  const errors = await openGame(page);
  await page.click('#playBtn');
  const easy = await page.evaluate(() => window.__BT.simulate(4));
  expect(easy.ok).toBe(true);
  expect(easy.deaths).toBe(0);
  expect(easy.floor).toBeGreaterThanOrEqual(4);

  if (info.project.name === 'desktop') {
    const hazard = await page.evaluate(() => window.__BT.runUntil((s) => String(s.groundId || '').includes('spin')));
    expect(String(hazard.groundId)).toContain('spin');
    await page.screenshot({ path: `${ART}/screenshot_hazard_floor.png` });
  }

  const before = await page.evaluate(() => window.__BT.getState());
  const after = await page.evaluate(() => window.__BT.kill());
  expect(after.deaths).toBe(before.deaths + 1);
  expect(after.onGround).toBe(true);
  expect(after.y).toBeGreaterThan(after.floor);
  expect(after.floor).toBe(before.floor);

  if (info.project.name === 'desktop') {
    const win = await page.evaluate(() => window.__BT.simulate(100));
    expect(win.won).toBe(true);
    expect(win.floor).toBe(10);
    await expect(page.locator('#finish')).toBeVisible();
    await expect(page.locator('#finishTime')).not.toHaveText('—');
    await expect(page.locator('#finishHighest')).toHaveText('10');
    await page.screenshot({ path: `${ART}/screenshot_finish_records.png` });
  }
  assertClean(errors);
});

test('touch joystick and jump', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'touch project only');
  const errors = await openGame(page);
  await page.click('#playBtn');
  await expect(page.locator('#touch')).toBeVisible();
  const before = await page.evaluate(() => window.__BT.getState().x);
  await page.evaluate(() => {
    const el = document.getElementById('stickZone');
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: x,
      clientY: y,
    }));
    fire('pointerdown', cx, cy);
    fire('pointermove', cx, cy - 36);
  });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__BT.getState().x);
  expect(after).toBeGreaterThan(before + 0.35);
  const y0 = await page.evaluate(() => window.__BT.getState().y);
  await page.evaluate(() => {
    document.getElementById('jumpBtn').dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 20,
      clientY: 20,
    }));
  });
  await page.waitForTimeout(160);
  const y1 = await page.evaluate(() => window.__BT.getState().y);
  expect(y1).toBeGreaterThan(y0 + 0.3);
  assertClean(errors);
});

test('no page zoom and portrait hint', async ({ page }, info) => {
  const errors = await openGame(page);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('user-scalable=no');
  expect(viewport).toContain('maximum-scale=1');
  expect(viewport).toContain('viewport-fit=cover');
  const touchAction = await page.evaluate(() => getComputedStyle(document.documentElement).touchAction);
  expect(touchAction).toBe('none');
  const scale = await page.evaluate(() => (window.visualViewport ? window.visualViewport.scale : 1));
  expect(scale).toBe(1);
  if (info.project.name !== 'desktop') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    await expect(page.locator('#rotate')).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
  }
  assertClean(errors);
});

test('feedback notice, filter, length, and offline queue', async ({ page }, info) => {
  const errors = await openGame(page);
  const external = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('http://127.0.0.1') && !url.startsWith('http://localhost')) external.push(url);
  });
  await page.click('#feedbackBtn');
  await expect(page.locator('#fbNotice')).toContainText('چی کۆدەکرێتەوە');
  await expect(page.locator('#fbNotice')).toContainText('What is collected');
  await expect(page.locator('#fbNotice')).toContainText('12');
  await expect(page.locator('#fbWarn')).toContainText("Don't type personal information");
  await expect(page.locator('#fbPrivacy')).toHaveAttribute('href', 'privacy.html');
  expect(await page.locator('#fbText').getAttribute('maxlength')).toBe('500');
  await page.locator('#fbText').fill('a'.repeat(500));
  expect((await page.locator('#fbText').inputValue()).length).toBe(500);
  await page.click('#fbSend');
  await expect(page.locator('#fbStatus')).toContainText('نمرە');
  await page.click('[data-score="4"]');
  await page.locator('#fbText').fill('hello a@b.com call 07555111222 see http://evil.test code 123456789 this is shit');
  await page.click('#fbSend');
  await expect(page.locator('#fbStatus')).toContainText('پاشەکەوت کرا، دواتر دەنێردرێت');
  await expect(page.locator('#fbStatus')).toContainText('Saved on this device');
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem('bt-feedback-queue')));
  expect(queued).toHaveLength(1);
  expect(queued[0].rating).toBe(4);
  expect(queued[0].version).toBe('1.0.0');
  expect(queued[0].timestamp % 3600000).toBe(0);
  expect(queued[0].text).not.toMatch(/@/);
  expect(queued[0].text).not.toMatch(/http/i);
  expect(queued[0].text).not.toMatch(/\d{6,}/);
  expect(queued[0].text).toContain('***');
  expect(queued[0].text.length).toBeLessThanOrEqual(500);
  expect(external).toEqual([]);
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: `${ART}/screenshot_feedback.png` });
  }
  assertClean(errors);
});

test('help screen, community links, and leaving confirm', async ({ page }, info) => {
  const errors = await openGame(page);
  await page.click('#helpBtn');
  await expect(page.locator('#help')).toContainText('WASD');
  await expect(page.locator('#help')).toContainText('جۆیستیکی چەپ');
  await expect(page.locator('#help')).toContainText('localStorage');
  await expect(page.locator('#help')).toContainText('Made with AI assistance (code and graphics)');
  await expect(page.locator('#help')).toContainText('نازهاد ئیبراهیم');
  const hrefs = await page.locator('#community a').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual([
    'https://happytoonsstudio.com',
    'https://www.tiktok.com/@happytoonsstudiok',
    'mailto:hello@happytoonsstudio.com',
    'https://www.youtube.com/@StepWiseSimple',
  ]);
  for (const href of hrefs) {
    expect(href.toLowerCase()).not.toContain('twitter');
    expect(href.toLowerCase()).not.toContain('x.com');
  }
  const rels = await page.locator('#community a').evaluateAll((els) => els.map((a) => a.getAttribute('rel')));
  expect(rels.every((rel) => rel && rel.includes('noopener') && rel.includes('noreferrer'))).toBe(true);
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: `${ART}/screenshot_help.png` });
  }
  await page.evaluate(() => {
    window.__opened = [];
    window.open = (url, target, features) => {
      window.__opened.push({ url, target, features });
      return null;
    };
  });
  await page.click('a[data-link="youtube"]');
  await expect(page.locator('#leave')).toBeVisible();
  await expect(page.locator('#leave')).toContainText('You are leaving the game');
  await expect(page.locator('#leave')).toContainText('دەچیتە دەرەوەی یارییەکە');
  await page.click('#leaveStay');
  await expect(page.locator('#leave')).toBeHidden();
  expect(await page.evaluate(() => window.__opened)).toEqual([]);
  await page.click('a[data-link="tiktok"]');
  await page.click('#leaveGo');
  const opened = await page.evaluate(() => window.__opened);
  expect(opened[0].url).toContain('https://www.tiktok.com/@happytoonsstudiok');
  expect(opened[0].target).toBe('_blank');
  expect(opened[0].features).toContain('noopener');
  expect(opened[0].features).toContain('noreferrer');
  assertClean(errors);
});

test('fps stays usable with 4x CPU throttle', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'CDP throttling is Chromium desktop');
  const errors = await openGame(page);
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.click('#playBtn');
  await page.waitForTimeout(2500);
  const fps = Number(await page.locator('#perf').textContent());
  console.log(`throttled fps: ${fps}`);
  expect(fps).toBeGreaterThanOrEqual(24);
  assertClean(errors);
});
