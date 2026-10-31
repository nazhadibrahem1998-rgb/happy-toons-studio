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
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#playBtn')).toHaveText('Play');
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
  await page.evaluate(() => window.__BT.setRivals('off'));
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

  const win = await page.evaluate(() => window.__BT.simulate(100));
  expect(win.won).toBe(true);
  expect(win.floor).toBe(10);
  if (info.project.name === 'desktop') {
    await expect(page.locator('#finish')).toBeVisible();
    await expect(page.locator('#finishTime')).not.toHaveText('—');
    await expect(page.locator('#finishHighest')).toHaveText('10');
    await page.screenshot({ path: `${ART}/screenshot_finish_records.png` });
    await page.evaluate(() => { document.getElementById('finish').hidden = true; });
    await page.waitForFunction(() => window.__BT.signsReady);
    await page.screenshot({ path: `${ART}/screenshot_studio_signs.png` });
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
    await page.click('#playBtn');
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

test('three full clears do not grow geometries, textures, or draw calls', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'heap and GC flags are on the desktop Chromium project');
  const errors = await openGame(page);
  await page.click('#playBtn');
  const samples = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const run = window.__BT.simulate(100);
      window.__BT.restart();
      if (window.gc) window.gc();
      const stats = window.__BT.stats();
      out.push({ won: run.won, deaths: run.deaths, ...stats });
    }
    return out;
  });
  console.log('soak', JSON.stringify(samples));
  for (const sample of samples) {
    expect(sample.won).toBe(true);
    expect(sample.deaths).toBe(0);
  }
  expect(samples[1].geometries).toBe(samples[0].geometries);
  expect(samples[2].geometries).toBe(samples[0].geometries);
  expect(samples[2].textures).toBe(samples[0].textures);
  expect(samples[1].textures).toBe(samples[0].textures);
  expect(samples[2].calls).toBe(samples[0].calls);
  expect(samples[2].triangles).toBe(samples[0].triangles);
  if (samples[0].heap != null && samples[2].heap != null) {
    expect(samples[2].heap).toBeLessThan(samples[0].heap + 4_000_000);
  }
  assertClean(errors);
});

test('graphics context loss resumes from the checkpoint', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop' && info.project.name !== 'iphone', 'synthetic context restore is checked on Chromium; WebKit logs a driver error if the context was never really lost');
  const errors = await openGame(page);
  await page.click('#playBtn');
  await page.evaluate(() => window.__BT.simulate(4));
  const before = await page.evaluate(() => window.__BT.getState());
  await page.evaluate(() => {
    document.getElementById('c').dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  });
  await expect(page.locator('#glLost')).toBeVisible();
  await expect(page.locator('#glLost')).toContainText('Graphics paused');
  const after = await page.evaluate(() => {
    document.getElementById('c').dispatchEvent(new Event('webglcontextrestored'));
    return window.__BT.getState();
  });
  await expect(page.locator('#glLost')).toBeHidden();
  expect(after.floor).toBe(before.floor);
  expect(after.onGround).toBe(true);
  const later = await page.evaluate(() => {
    const t0 = window.__BT.getState().playTime;
    return t0;
  });
  await page.waitForTimeout(250);
  const t1 = await page.evaluate(() => window.__BT.getState().playTime);
  expect(t1).toBeGreaterThan(later);
  assertClean(errors);
});

async function swipe(page, panel, yStart, yEnd) {
  const box = await panel.boundingBox();
  const x = box.x + Math.min(box.width * 0.5, box.width - 28);
  let session = null;
  try { session = await page.context().newCDPSession(page); } catch { session = null; }
  if (session) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: yStart }] });
    for (let i = 1; i <= 8; i++) {
      const y = yStart + ((yEnd - yStart) * i) / 8;
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return;
  }
  await panel.evaluate((el, coords) => {
    const fire = (type, y) => {
      const point = document.createTouch(window, el, 1, coords.x, y, coords.x, y);
      const list = document.createTouchList(point);
      const empty = document.createTouchList();
      const ev = new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === 'touchend' ? empty : list,
        targetTouches: type === 'touchend' ? empty : list,
        changedTouches: list,
      });
      el.dispatchEvent(ev);
    };
    fire('touchstart', coords.yStart);
    const steps = 8;
    for (let i = 1; i <= steps; i++) fire('touchmove', coords.yStart + ((coords.yEnd - coords.yStart) * i) / steps);
    fire('touchend', coords.yEnd);
  }, { x, yStart, yEnd });
}

test('overlays scroll by touch and the bottom button is reachable', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'phone touch scroll');
  test.setTimeout(180000);
  const errors = await openGame(page);
  const sizes = [[390, 844], [844, 390], [375, 667], [667, 375], [390, 664], [750, 342]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const [open, root, bottom] of [
      ['#feedbackBtn', '#feedback', '#fbClose'],
      ['#helpBtn', '#help', '#helpClose'],
      ['#upgradeBtn', '#upgrades', '#upgradeClose'],
    ]) {
      await page.click(open);
      const panel = page.locator(`${root} .panel`);
      await expect(panel).toBeVisible();
      await panel.evaluate((el) => { el.scrollTop = 0; });
      const metrics = await panel.evaluate((el) => ({ top: el.scrollTop, extra: el.scrollHeight - el.clientHeight }));
      expect(metrics.extra).toBeGreaterThan(8);
      const box = await panel.boundingBox();
      await swipe(page, panel, box.y + Math.min(box.height * 0.72, box.height - 20), box.y + 24);
      await page.waitForTimeout(120);
      const after = await panel.evaluate((el) => el.scrollTop);
      expect(after).toBeGreaterThan(metrics.top);
      const btn = page.locator(bottom);
      for (let n = 0; n < 6; n++) {
        const b = await btn.boundingBox();
        if (b && b.y >= 0 && b.y + b.height <= height - 2) break;
        const again = await panel.boundingBox();
        await swipe(page, panel, again.y + again.height * 0.75, again.y + 16);
      }
      const visible = await btn.boundingBox();
      expect(visible.y).toBeGreaterThanOrEqual(0);
      expect(visible.y + visible.height).toBeLessThanOrEqual(height + 1);
      if (info.project.name === 'webkit' && width === 390 && height === 844 && open === '#feedbackBtn') {
        await page.screenshot({ path: `${ART}/screenshot_feedback_scrolled.png` });
      }
      if (info.project.name === 'webkit' && width === 390 && height === 844 && open === '#upgradeBtn') {
        await page.screenshot({ path: `${ART}/screenshot_upgrades_iphone.png` });
      }
      await btn.click();
      await expect(page.locator(root)).toBeHidden();
    }
  }
  const canvasBlocked = await page.evaluate(() => {
    const canvas = document.querySelector('#c');
    let ev;
    if (typeof document.createTouch === 'function') {
      const point = document.createTouch(window, canvas, 9, 40, 40, 40, 40);
      const list = document.createTouchList(point);
      ev = new TouchEvent('touchmove', {
        bubbles: true, cancelable: true, touches: list, targetTouches: list, changedTouches: list,
      });
    } else {
      const point = new Touch({ identifier: 9, target: canvas, clientX: 40, clientY: 40 });
      ev = new TouchEvent('touchmove', {
        bubbles: true, cancelable: true, touches: [point], targetTouches: [point], changedTouches: [point],
      });
    }
    canvas.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  expect(canvasBlocked).toBe(true);
  assertClean(errors);
});

test('left and right match the screen at several camera angles', async ({ page }, info) => {
  test.skip(info.project.name === 'android', 'covered on desktop and WebKit');
  const errors = await openGame(page);
  await page.click('#playBtn');
  await page.evaluate(() => window.__BT.freezeCam(true));
  for (const angle of [0, Math.PI / 2, Math.PI, -1.1]) {
    await page.evaluate((yaw) => {
      window.__BT.resetFeet();
      window.__BT.setYaw(yaw);
    }, angle);
    const before = await page.evaluate(() => {
      const s = window.__BT.getState();
      return window.__BT.project(s.x, s.y + 1, s.z).x;
    });
    await page.evaluate(() => window.__BT.strafeStep(-1, 12));
    const left = await page.evaluate(() => {
      const s = window.__BT.getState();
      return window.__BT.project(s.x, s.y + 1, s.z).x;
    });
    expect(left).toBeLessThan(before - 6);
    await page.evaluate((yaw) => {
      window.__BT.resetFeet();
      window.__BT.setYaw(yaw);
    }, angle);
    await page.evaluate(() => window.__BT.strafeStep(1, 12));
    const right = await page.evaluate(() => {
      const s = window.__BT.getState();
      return window.__BT.project(s.x, s.y + 1, s.z).x;
    });
    expect(right).toBeGreaterThan(before + 6);
  }
  await page.evaluate(() => {
    window.__BT.resetFeet();
    window.__BT.setYaw(0);
  });
  const keysBefore = await page.evaluate(() => {
    const s = window.__BT.getState();
    return window.__BT.project(s.x, s.y + 1, s.z).x;
  });
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(180);
  await page.keyboard.up('ArrowLeft');
  const keysAfter = await page.evaluate(() => {
    const s = window.__BT.getState();
    return window.__BT.project(s.x, s.y + 1, s.z).x;
  });
  expect(keysAfter).toBeLessThan(keysBefore - 4);
  assertClean(errors);
});

test('rivals race offline and the results list places', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'WebKit and Android cover the full race in the phone pass');
  const errors = await openGame(page);
  await page.click('[data-rival="hard"]');
  await expect(page.locator('[data-rival="hard"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#langCkb');
  await expect(page.locator('[data-rival="hard"]')).toHaveText('قورس');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.click('#langEn');
  await page.click('#playBtn');
  await expect(page.locator('#placeRow')).toBeVisible();
  const preview = await page.evaluate(() => window.__BT.warmupRivals(200));
  expect(preview).toHaveLength(3);
  expect(Math.max(...preview.map((rival) => rival.x))).toBeGreaterThan(4);
  await page.evaluate(() => window.__BT.restart());
  const race = await page.evaluate(() => window.__BT.simulateRace());
  expect(race.won).toBe(true);
  expect(race.deaths).toBe(0);
  expect(race.rows).toHaveLength(4);
  expect(race.rows.some((row) => row.id === 'you' && row.finished)).toBe(true);
  await expect(page.locator('#raceResults li')).toHaveCount(4);
  await expect(page.locator('#raceResults')).toContainText('Nari');
  await expect(page.locator('#raceResults')).toContainText('Peko');
  await expect(page.locator('#raceResults')).toContainText('Vilo');
  await expect(page.locator('#raceResults')).toContainText('1st');
  await expect(page.locator('#raceResults .me')).toContainText('You');
  await page.screenshot({ path: `${ART}/screenshot_race_results.png` });
  await page.evaluate(() => window.__BT.setRivals('off'));
  await page.evaluate(() => window.__BT.restart());
  await expect(page.locator('#placeRow')).toBeHidden();
  await expect(page.locator('#raceResults')).toBeHidden();
  assertClean(errors);
});

test('gem upgrades pause the timer and the rivals', async ({ page }, info) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__BT.setRivals('easy'));
  await page.click('#playBtn');
  await page.waitForTimeout(350);
  await page.click('#gemBtn');
  await expect(page.locator('#upgrades')).toBeVisible();
  await expect(page.locator('#upgrades')).toContainText('Rank 0/2');
  await expect(page.locator('#upgrades')).toContainText('gems');
  const held = await page.evaluate(() => window.__BT.raceClock());
  await page.waitForTimeout(450);
  const still = await page.evaluate(() => window.__BT.raceClock());
  expect(still.playTime).toBe(held.playTime);
  expect(still.xs[0]).toBeCloseTo(held.xs[0], 2);
  if (info.project.name === 'webkit') {
    await page.screenshot({ path: `${ART}/screenshot_upgrades_paused.png` });
  }
  await page.click('#upgradeClose');
  await expect(page.locator('#upgrades')).toBeHidden();
  await page.waitForTimeout(400);
  const later = await page.evaluate(() => window.__BT.raceClock());
  expect(later.playTime).toBeGreaterThan(held.playTime + 0.2);
  assertClean(errors);
});

test('landscape menu keeps Play on screen', async ({ page }, info) => {
  const errors = await openGame(page);
  const sizes = [[844, 390], [750, 342], [667, 375], [390, 664], [390, 844]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const play = await page.locator('#playBtn').boundingBox();
    expect(play, `${width}x${height}`).toBeTruthy();
    expect(play.y, `${width}x${height}`).toBeGreaterThanOrEqual(0);
    expect(play.y + play.height, `${width}x${height}`).toBeLessThanOrEqual(height);
    expect(await page.locator('#menu .panel').evaluate((el) => el.scrollTop)).toBe(0);
    if (info.project.name === 'webkit' && width === 750 && height === 342) {
      const hint = page.locator('#iosHint');
      await expect(hint).toBeVisible();
      const box = await hint.boundingBox();
      expect(box.height).toBeLessThan(78);
      await page.screenshot({ path: `${ART}/screenshot_menu_landscape_750.png` });
    }
  }
  assertClean(errors);
});

test('panels reopen at the top', async ({ page }) => {
  const errors = await openGame(page);
  await page.click('#helpBtn');
  const panel = page.locator('#help .panel');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const scrolled = await panel.evaluate((el) => {
    el.scrollTop = 600;
    return el.scrollTop;
  });
  expect(scrolled).toBeGreaterThan(200);
  await page.click('#helpClose');
  await page.click('#helpBtn');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await panel.evaluate((el) => el.scrollTop)).toBe(0);
  assertClean(errors);
});

test('leave dialog Stay fits at 750x342', async ({ page }) => {
  const errors = await openGame(page);
  await page.setViewportSize({ width: 750, height: 342 });
  await page.click('#helpBtn');
  await page.locator('a[data-link="website"]').click();
  await expect(page.locator('#leave')).toBeVisible();
  const stay = await page.locator('#leaveStay').boundingBox();
  expect(stay).toBeTruthy();
  expect(stay.y).toBeGreaterThanOrEqual(0);
  expect(stay.y + stay.height).toBeLessThanOrEqual(342);
  const go = await page.locator('#leaveGo').boundingBox();
  expect(go.y + go.height).toBeLessThanOrEqual(342);
  assertClean(errors);
});

test('portrait HUD and controls fit, and the rotate tip can be dismissed', async ({ page }, info) => {
  const errors = await openGame(page);
  const phone = info.project.name !== 'desktop';
  await page.setViewportSize({ width: 390, height: 844 });
  if (info.project.name === 'webkit') {
    await page.screenshot({ path: `${ART}/screenshot_portrait_menu.png` });
  }
  await page.click('#playBtn');
  const sizes = [[375, 667], [390, 844]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('#hud')).toBeVisible();
    const floor = await page.locator('#floorLabel').boundingBox();
    const gems = await page.locator('#gemBtn').boundingBox();
    const pause = await page.locator('#pauseBtn').boundingBox();
    const place = await page.locator('#placeRow').boundingBox();
    const mid = (box) => box.y + box.height / 2;
    for (const box of [floor, gems, pause, place]) {
      expect(box, `${width}x${height}`).toBeTruthy();
      expect(box.x, `${width}x${height}`).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, `${width}x${height}`).toBeLessThanOrEqual(width + 1);
      expect(Math.abs(mid(box) - mid(floor)), `${width}x${height}`).toBeLessThan(10);
    }
    const hud = await page.locator('#hud').boundingBox();
    expect(hud.height, `${width}x${height}`).toBeLessThan(52);
    if (phone) {
      await expect(page.locator('#rotate')).toBeVisible();
      const tip = await page.locator('#rotate').boundingBox();
      expect(tip.y).toBeGreaterThanOrEqual(hud.y + hud.height - 1);
      const stick = await page.locator('#stickZone').boundingBox();
      const jump = await page.locator('#jumpBtn').boundingBox();
      expect(stick.width).toBeGreaterThanOrEqual(96);
      expect(jump.width).toBeGreaterThanOrEqual(64);
      expect(stick.y + stick.height).toBeLessThanOrEqual(height);
      expect(jump.y + jump.height).toBeLessThanOrEqual(height);
      expect(jump.x).toBeGreaterThan(stick.x + stick.width + 8);
      expect(stick.x).toBeLessThan(width / 2);
      expect(jump.x).toBeGreaterThan(width / 2);
    }
    if (info.project.name === 'webkit' && width === 390) {
      await page.screenshot({ path: `${ART}/screenshot_portrait_play.png` });
    }
  }
  if (phone) {
    await page.click('#rotateDismiss');
    await expect(page.locator('#rotate')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('bt-rotate-ok'))).toBe('1');
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#rotate')).toBeHidden();
  }
  if (info.project.name === 'webkit') {
    const hint = page.locator('#iosHintText');
    const english = await hint.evaluate((el) => el.textContent);
    expect(english).toContain('Add to Home Screen');
    expect(english).not.toMatch(/شاش/);
    await page.click('#pauseBtn');
    await page.click('#pauseMenu');
    await page.click('#langCkb');
    await expect(hint).toHaveAttribute('dir', 'rtl');
    const sorani = await hint.evaluate((el) => el.textContent);
    expect(sorani).toContain('شاشەی تەواو');
    expect(sorani).not.toContain('Full screen:');
  }
  const lines = await page.locator('#rotate p').evaluateAll((els) => els.map((el) => ({
    dir: el.getAttribute('dir'),
    text: el.textContent,
  })));
  expect(lines.map((line) => line.dir)).toEqual(['ltr', 'rtl']);
  expect(lines.some((line) => line.text.includes('·'))).toBe(false);
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
