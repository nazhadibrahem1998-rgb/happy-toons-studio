import { test, expect } from '@playwright/test';

const ART = '/opt/cursor/artifacts';

function watch(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

async function boot(page) {
  const errors = watch(page);
  await page.goto('/block-tower/?test=1');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__BT && window.__BT.ready);
  await page.waitForTimeout(200);
  return errors;
}

async function scrollControlIntoView(panel, control, viewportHeight) {
  for (let n = 0; n < 8; n++) {
    const box = await control.boundingBox();
    if (box && box.y >= 4 && box.y + box.height <= viewportHeight - 4) return;
    await swipe(panel.page(), panel);
  }
  const box = await control.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight);
}

async function swipe(page, panel) {
  const box = await panel.boundingBox();
  const yStart = box.y + Math.min(box.height * 0.7, box.height - 24);
  const yEnd = box.y + 20;
  const x = box.x + box.width * 0.45;
  let session = null;
  try { session = await page.context().newCDPSession(page); } catch { session = null; }
  if (session) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: yStart }] });
    for (let i = 1; i <= 8; i++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: yStart + ((yEnd - yStart) * i) / 8 }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return;
  }
  await panel.evaluate((el, coords) => {
    const fire = (type, y) => {
      const point = document.createTouch(window, el, 3, coords.x, y, coords.x, y);
      const list = document.createTouchList(point);
      const empty = document.createTouchList();
      el.dispatchEvent(new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === 'touchend' ? empty : list,
        targetTouches: type === 'touchend' ? empty : list,
        changedTouches: list,
      }));
    };
    fire('touchstart', coords.yStart);
    for (let i = 1; i <= 8; i++) fire('touchmove', coords.yStart + ((coords.yEnd - coords.yStart) * i) / 8);
    fire('touchend', coords.yEnd);
  }, { x, yStart, yEnd });
}

test('phone QA: every control, both orientations, full tower', async ({ page }, info) => {
  test.skip(info.project.name !== 'webkit' && info.project.name !== 'android', 'phone browsers only');
  test.setTimeout(180000);
  const errors = await boot(page);
  const portrait = info.project.name === 'webkit' ? { width: 390, height: 844 } : { width: 412, height: 915 };
  const landscape = info.project.name === 'webkit' ? { width: 844, height: 390 } : { width: 915, height: 412 };

  await page.setViewportSize(portrait);
  if (await page.locator('#iosHint').isVisible()) await page.click('#iosDismiss');
  await expect(page.locator('#playBtn')).toBeVisible();
  await expect(page.locator('#footerCredit')).toHaveText('© 2026 Nazhad Ibrahem – Happy Toons Studio');

  await page.click('#helpBtn');
  const help = page.locator('#help .panel');
  const helpTop = await help.evaluate((el) => el.scrollTop);
  await swipe(page, help);
  expect(await help.evaluate((el) => el.scrollTop)).toBeGreaterThan(helpTop);
  for (const id of ['website', 'tiktok', 'email', 'youtube']) {
    await page.locator(`a[data-link="${id}"]`).click();
    await expect(page.locator('#leave')).toBeVisible();
    await expect(page.locator('#leave')).toContainText('You are leaving the game');
    await page.click('#leaveStay');
    await expect(page.locator('#leave')).toBeHidden();
  }
  const helpClose = page.locator('#helpClose');
  await scrollControlIntoView(help, helpClose, portrait.height);
  await helpClose.click();
  await expect(page.locator('#help')).toBeHidden();

  await page.click('#feedbackBtn');
  await expect(page.locator('#fbNotice')).toContainText('What is collected');
  await expect(page.locator('#fbNotice')).toContainText('چی کۆدەکرێتەوە');
  const feedback = page.locator('#feedback .panel');
  const fbTop = await feedback.evaluate((el) => el.scrollTop);
  await swipe(page, feedback);
  expect(await feedback.evaluate((el) => el.scrollTop)).toBeGreaterThan(fbTop);
  for (const score of [1, 2, 3, 4, 5]) await page.click(`[data-score="${score}"]`);
  await expect(page.locator('[data-score="5"]')).toHaveAttribute('aria-pressed', 'true');
  const fbClose = page.locator('#fbClose');
  await scrollControlIntoView(feedback, fbClose, portrait.height);
  if (info.project.name === 'webkit') {
    await page.screenshot({ path: `${ART}/screenshot_feedback_scrolled.png` });
  }
  await fbClose.click();
  await expect(page.locator('#feedback')).toBeHidden();

  await page.click('#upgradeBtn');
  const upgrades = page.locator('#upgrades .panel');
  await expect(upgrades).toContainText('Higher jump');
  await expect(upgrades).toContainText('بازدانی بەرزتر');
  await expect(upgrades).toContainText('Glide');
  const upTop = await upgrades.evaluate((el) => el.scrollTop);
  await swipe(page, upgrades);
  expect(await upgrades.evaluate((el) => el.scrollTop)).toBeGreaterThan(upTop);
  const upClose = page.locator('#upgradeClose');
  await scrollControlIntoView(upgrades, upClose, portrait.height);
  if (info.project.name === 'webkit') {
    await page.screenshot({ path: `${ART}/screenshot_upgrades_iphone.png` });
  }
  await upClose.click();

  const menu = page.locator('#menu .panel');
  const menuExtra = await menu.evaluate((el) => el.scrollHeight - el.clientHeight);
  if (menuExtra > 8) {
    const menuTop = await menu.evaluate((el) => el.scrollTop);
    await swipe(page, menu);
    expect(await menu.evaluate((el) => el.scrollTop)).toBeGreaterThan(menuTop);
  }
  await page.click('#qualityBtn');
  await expect(page.locator('#qualityBtn')).toHaveText('High');
  await page.click('#qualityBtn');
  await expect(page.locator('#qualityBtn')).toHaveText('Low');
  await page.locator('#swatches button:not([disabled])').first().click();

  await page.click('[data-rival="off"]');
  await expect(page.locator('[data-rival="off"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-rival="easy"]');
  await page.click('[data-rival="medium"]');
  await page.click('[data-rival="hard"]');
  await expect(page.locator('[data-rival="hard"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#langCkb');
  await expect(page.locator('[data-rival="hard"]')).toHaveText('قورس');
  await expect(page.locator('[data-rival="off"]')).toHaveText('کوژاوە');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#playBtn')).toHaveText('یاریکردن');
  await expect(page.locator('#jumpBtn')).toHaveText('بازدان');
  if (info.project.name === 'webkit') {
    await page.screenshot({ path: `${ART}/screenshot_menu_rtl_iphone.png` });
  }
  await page.click('#langEn');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#playBtn')).toHaveText('Play');

  async function stick(dx, dy) {
    await page.evaluate(({ dx, dy }) => {
      const el = document.getElementById('stickZone');
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 4, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y,
      }));
      fire('pointerdown', cx, cy);
      fire('pointermove', cx + dx, cy + dy);
    }, { dx, dy });
    await page.waitForTimeout(220);
    const sample = await page.evaluate(() => {
      const s = window.__BT.getState();
      const screen = window.__BT.project(s.x, s.y + 1, s.z);
      return { x: s.x, z: s.z, screenX: screen.x, screenY: screen.y };
    });
    await page.evaluate(() => {
      document.getElementById('stickZone').dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, pointerId: 4, pointerType: 'touch', isPrimary: true,
      }));
    });
    await page.waitForTimeout(40);
    return sample;
  }

  async function directions(label) {
    await page.evaluate(() => window.__BT.freezeCam(true));
    for (const angle of [0, Math.PI / 2, Math.PI]) {
      await page.evaluate(() => window.__BT.resetFeet());
      await page.evaluate((yaw) => window.__BT.setYaw(yaw), angle);
      const origin = await page.evaluate(() => {
        const s = window.__BT.getState();
        const screen = window.__BT.project(s.x, s.y + 1, s.z);
        return { screenX: screen.x, screenY: screen.y };
      });
      const left = await stick(-40, 0);
      expect(left.screenX, `${label} stick left yaw ${angle}`).toBeLessThan(origin.screenX - 4);
      await page.evaluate(() => window.__BT.resetFeet());
      const right = await stick(40, 0);
      expect(right.screenX, `${label} stick right yaw ${angle}`).toBeLessThan(10000);
      expect(right.screenX, `${label} stick right yaw ${angle}`).toBeGreaterThan(origin.screenX + 4);
      await page.evaluate(() => window.__BT.resetFeet());
      const up = await stick(0, -40);
      expect(up.screenY, `${label} stick up yaw ${angle}`).toBeLessThan(origin.screenY - 2);
      await page.evaluate(() => window.__BT.resetFeet());
      const down = await stick(0, 40);
      expect(down.screenY, `${label} stick down yaw ${angle}`).toBeGreaterThan(origin.screenY + 2);
    }
    await page.evaluate(() => window.__BT.freezeCam(false));
  }

  for (const [label, size] of [['portrait', portrait], ['landscape', landscape]]) {
    await page.setViewportSize(size);
    if (label === 'landscape') await page.click('#playBtn');
    else {
      await page.click('#playBtn');
    }
    await expect(page.locator('#touch')).toBeVisible();
    await expect(page.locator('#placeRow')).toBeVisible();
    await expect(page.locator('#placeNum')).toHaveText(/^(1st|2nd|3rd|4th)$/);
    const stickBox = await page.locator('#stickZone').boundingBox();
    const jumpBox = await page.locator('#jumpBtn').boundingBox();
    expect(stickBox.x, `${label} stick stays on the left`).toBeLessThan(size.width / 2);
    expect(jumpBox.x, `${label} jump stays on the right`).toBeGreaterThan(size.width / 2);
    if (label === 'portrait') await expect(page.locator('#rotate')).toBeVisible();
    else await expect(page.locator('#rotate')).toBeHidden();
    await directions(label);
    await page.evaluate(() => window.__BT.resetFeet());
    await page.evaluate(() => window.__BT.setYaw(0));

    const yaw0 = await page.evaluate(() => window.__BT.cameraInfo().yaw);
    await page.evaluate(() => {
      const c = document.getElementById('c');
      const rect = c.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const fire = (type, cx) => c.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 11, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: y,
      }));
      fire('pointerdown', x);
      fire('pointermove', x + 90);
      fire('pointerup', x + 90);
    });
    const yawRight = await page.evaluate(() => window.__BT.cameraInfo().yaw);
    expect(yawRight, `${label} look right`).toBeGreaterThan(yaw0 + 0.2);
    await page.evaluate(() => {
      const c = document.getElementById('c');
      const rect = c.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const fire = (type, cx) => c.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 12, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: y,
      }));
      fire('pointerdown', x);
      fire('pointermove', x - 90);
      fire('pointerup', x - 90);
    });
    const yawLeft = await page.evaluate(() => window.__BT.cameraInfo().yaw);
    expect(yawLeft, `${label} look left`).toBeLessThan(yawRight - 0.2);

    const y0 = await page.evaluate(() => window.__BT.getState().y);
    await page.locator('#jumpBtn').dispatchEvent('pointerdown');
    await page.waitForTimeout(160);
    await page.locator('#jumpBtn').dispatchEvent('pointerup');
    const y1 = await page.evaluate(() => window.__BT.getState().y);
    expect(y1, `${label} jump`).toBeGreaterThan(y0 + 0.3);

    await page.click('#muteBtn');
    await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.click('#muteBtn');
    await page.click('#fullBtn');
    await page.click('#gemBtn');
    await expect(page.locator('#upgrades')).toBeVisible();
    await page.click('#upgradeClose');
    await page.click('#pauseBtn');
    await expect(page.locator('#pause')).toBeVisible();
    await page.click('#pauseHelp');
    await expect(page.locator('#help')).toBeVisible();
    await page.click('#helpClose');
    await page.click('#pauseUpgrades');
    await expect(page.locator('#upgrades')).toBeVisible();
    await page.click('#upgradeClose');
    await page.click('#resumeBtn');
    await expect(page.locator('#hud')).toBeVisible();

    if (label === 'portrait') {
      await page.click('#pauseBtn');
      await page.click('#pauseMenu');
    }
  }

  await page.setViewportSize(landscape);
  const died = await page.evaluate(() => window.__BT.kill());
  expect(died.deaths).toBeGreaterThan(0);
  expect(died.onGround).toBe(true);

  await page.evaluate(() => window.__BT.giveGems(40));
  await page.click('#gemBtn');
  for (const name of ['Dash', 'Shield', 'Double jump', 'Glide']) {
    await page.locator('#upgrades .upgrade', { hasText: name }).locator('button').click();
  }
  await page.click('#upgradeClose');
  await expect(page.locator('#dashBtn')).toBeVisible();
  await expect(page.locator('#shieldPip')).toBeVisible();
  await page.evaluate(() => { window.__BT.resetFeet(); window.__BT.setYaw(0); });
  await page.locator('#dashBtn').dispatchEvent('pointerdown');
  await page.waitForTimeout(80);
  const burst = await page.evaluate(() => window.__BT.getState());
  await page.locator('#dashBtn').dispatchEvent('pointerup');
  expect(burst.vx).toBeGreaterThan(12);

  const shield = await page.evaluate(() => window.__BT.shieldHit());
  expect(shield.shieldOwned).toBe(true);
  expect(shield.deaths).toBe(shield.before);
  expect(shield.shieldReady).toBe(false);

  const air = await page.evaluate(() => window.__BT.airJump());
  expect(air.doubleJump).toBe(true);
  expect(air.airJumps).toBe(0);
  expect(air.vy).toBeGreaterThan(8);

  const glide = await page.evaluate(() => window.__BT.glideFall());
  expect(glide.hasGlide).toBe(true);
  expect(glide.vy).toBeGreaterThan(-3.3);
  expect(glide.vy).toBeLessThanOrEqual(-3.2);

  if (info.project.name === 'webkit') {
    await page.evaluate(() => window.__BT.focusGem());
    await page.screenshot({ path: `${ART}/screenshot_powerup_gameplay.png` });
  }

  await page.evaluate(() => window.__BT.restart());
  await page.evaluate(() => window.__BT.setRivals('hard'));
  const seen = await page.evaluate(() => window.__BT.warmupRivals(180));
  expect(seen).toHaveLength(3);
  expect(Math.max(...seen.map((rival) => rival.x))).toBeGreaterThan(4);
  await page.evaluate(() => window.__BT.frameRivals());
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (info.project.name === 'webkit') {
    await page.screenshot({ path: `${ART}/screenshot_rivals_race.png` });
  }
  await page.evaluate(() => window.__BT.restart());
  const clear = await page.evaluate(() => window.__BT.simulateRace());
  expect(clear.won).toBe(true);
  expect(clear.deaths).toBe(0);
  expect(clear.rows).toHaveLength(4);
  await expect(page.locator('#finish')).toBeVisible();
  await expect(page.locator('#finishTime')).not.toHaveText('—');
  await expect(page.locator('#raceResults li')).toHaveCount(4);
  await expect(page.locator('#raceResults')).toContainText('1st');
  await expect(page.locator('#raceResults')).toContainText('Nari');
  const finishPanel = page.locator('#finish .panel');
  await scrollControlIntoView(finishPanel, page.locator('#finishMenu'), landscape.height);
  await page.setViewportSize(portrait);
  await scrollControlIntoView(finishPanel, page.locator('#finishMenu'), portrait.height);
  if (info.project.name === 'webkit') {
    await page.screenshot({ path: `${ART}/screenshot_race_results.png` });
  }
  await page.click('#finishMenu');
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#playBtn')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});
