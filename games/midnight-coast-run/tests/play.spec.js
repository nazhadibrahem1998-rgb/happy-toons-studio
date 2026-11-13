const { test, expect } = require('@playwright/test');
const fs = require('fs');

const ART = '/opt/cursor/artifacts';

function track(page, bucket) {
  page.on('pageerror', function (err) { bucket.push('pageerror: ' + err.message); });
  page.on('console', function (msg) {
    if (msg.type() === 'error') bucket.push('console: ' + msg.text());
  });
}

async function fitIssues(page) {
  return page.evaluate(function () {
    const issues = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 2) {
      issues.push('horizontal page overflow ' + document.documentElement.scrollWidth);
    }
    const nodes = document.querySelectorAll('button, h1, h2, p, .clock, .pay, .obj, .wallet, .tag, .place, .credits, .blurb, .meta, .kicker, .sub, .stars');
    nodes.forEach(function (el) {
      if (el.closest('[hidden]')) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const label = (el.id || el.className || el.textContent || '').toString().trim().slice(0, 40);
      if (r.left < -2 || r.right > vw + 2) issues.push('offscreen ' + label);
      if (el.scrollWidth > el.clientWidth + 6 && (cs.overflowX === 'hidden' || cs.overflow === 'hidden')) {
        issues.push('clipped ' + label);
      }
    });
    return issues;
  });
}

async function installBot(page) {
  await page.evaluate(function () {
    const keys = {};
    function setKey(code, on) {
      if (!!keys[code] === on) return;
      keys[code] = on;
      window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: code, bubbles: true, cancelable: true }));
    }
    function release() {
      setKey('KeyW', false);
      setKey('KeyS', false);
      setKey('KeyA', false);
      setKey('KeyD', false);
      setKey('Space', false);
    }
    function pursuit(path, x, y) {
      if (!path.length) return { x: x, y: y };
      let bestSeg = 0;
      let bestD = Infinity;
      let proj = path[0];
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const denom = vx * vx + vy * vy || 1;
        let u = ((x - a.x) * vx + (y - a.y) * vy) / denom;
        if (u < 0) u = 0;
        else if (u > 1) u = 1;
        const px = a.x + vx * u;
        const py = a.y + vy * u;
        const d = Math.hypot(px - x, py - y);
        if (d < bestD) {
          bestD = d;
          bestSeg = i;
          proj = { x: px, y: py };
        }
      }
      let remain = 110;
      let cx = proj.x;
      let cy = proj.y;
      for (let i = bestSeg; i < path.length - 1; i++) {
        const b = path[i + 1];
        const seg = Math.hypot(b.x - cx, b.y - cy);
        if (seg >= remain) {
          const k = seg > 0 ? remain / seg : 0;
          return { x: cx + (b.x - cx) * k, y: cy + (b.y - cy) * k };
        }
        remain -= seg;
        cx = b.x;
        cy = b.y;
      }
      return path[path.length - 1];
    }
    let reverse = 0;
    let anchor = { x: 0, y: 0, at: 0 };
    function tick() {
      if (window.__stopBot) { release(); return; }
      const s = window.MCR.snapshot();
      const now = performance.now();
      if (s.mode !== 'play' || s.celebrating || !s.objective) {
        release();
        anchor.at = now;
        requestAnimationFrame(tick);
        return;
      }
      const path = window.City.route(s.x, s.y, s.objective.x, s.objective.y);
      const aim = pursuit(path, s.x, s.y);
      const desired = Math.atan2(aim.y - s.y, aim.x - s.x);
      let diff = desired - s.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      let steer = Math.abs(diff) < 0.12 ? 0 : (diff > 0 ? 1 : -1);
      const dist = Math.hypot(s.objective.x - s.x, s.objective.y - s.y);
      const want = Math.abs(diff) > 0.55 ? 72 : 168;
      let gas = 1;
      let brake = 0;
      if (Math.abs(s.speed) > want) { gas = 0; brake = 1; }
      else if (Math.abs(diff) > 0.85) { gas = 1; brake = 0; }
      if (dist < 120) {
        gas = 0;
        brake = Math.abs(s.speed) > 28 ? 1 : 0;
      }
      if (!anchor.at) anchor = { x: s.x, y: s.y, at: now };
      if (Math.hypot(s.x - anchor.x, s.y - anchor.y) > 36) anchor = { x: s.x, y: s.y, at: now };
      else if (now - anchor.at > 1300) {
        reverse = 550;
        anchor.at = now;
      }
      if (reverse > 0) {
        gas = 0;
        brake = 1;
        steer = steer === 0 ? 1 : -steer;
        reverse -= 16;
      }
      if (brake) gas = 0;
      setKey('KeyW', gas > 0);
      setKey('KeyS', brake > 0);
      setKey('KeyA', steer < 0);
      setKey('KeyD', steer > 0);
      requestAnimationFrame(tick);
    }
    window.__stopBot = false;
    requestAnimationFrame(tick);
  });
}

test.beforeAll(function () {
  fs.mkdirSync(ART, { recursive: true });
});

test('desktop title, three nights, shop and summary', async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'desktop', 'full run is desktop');
  test.setTimeout(240000);
  const errors = [];
  track(page, errors);
  await page.goto('/');
  await expect(page.locator('h1.logo')).toContainText('MIDNIGHT');
  await expect(page.locator('.credits').first()).toContainText('Happy Toons Studio');
  await expect(page.locator('body')).not.toContainText(/vice/i);
  expect(await fitIssues(page)).toEqual([]);
  await page.screenshot({ path: ART + '/midnight-coast-run-title.png' });

  await page.locator('#btn-help').click();
  await expect(page.locator('#screen-help h2')).toHaveText('HOW TO PLAY');
  expect(await fitIssues(page)).toEqual([]);
  await page.locator('#btn-help-back').click();

  await page.locator('#btn-settings').click();
  await expect(page.locator('#screen-settings h2')).toHaveText('SETTINGS');
  expect(await fitIssues(page)).toEqual([]);
  await page.locator('#btn-settings-back').click();

  await page.locator('#btn-play').click();
  await expect(page.locator('#brief-name')).toBeVisible();
  expect(await fitIssues(page)).toEqual([]);
  await page.locator('#btn-start-run').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#clock')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-pause h2')).toHaveText('HOLDING');
  expect(await fitIssues(page)).toEqual([]);
  await page.locator('#btn-resume').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#btn-sum-endless')).toBeHidden();

  await installBot(page);
  await page.waitForTimeout(2200);
  expect(await fitIssues(page)).toEqual([]);
  await page.screenshot({ path: ART + '/midnight-coast-run-gameplay.png' });
  for (let night = 1; night <= 3; night++) {
    await page.waitForFunction(function (n) {
      const s = window.MCR.snapshot();
      return s.mode === 'summary' && s.nightIndex === n;
    }, night, { timeout: 80000 });
    const snap = await page.evaluate(function () { return window.MCR.snapshot(); });
    expect(snap.cleared, 'night ' + night).toBe(true);
    expect(await fitIssues(page)).toEqual([]);
    if (night === 1) {
      await expect(page.locator('#btn-sum-next')).toBeVisible();
      await expect(page.locator('#btn-sum-endless')).toBeHidden();
      await page.waitForTimeout(400);
      await page.screenshot({ path: ART + '/midnight-coast-run-summary.png' });
    }
    if (night < 3) {
      await page.locator('#btn-sum-next').click();
      await page.locator('#btn-start-run').click();
      await expect(page.locator('#hud')).toBeVisible();
    }
  }
  await page.locator('#btn-sum-garage').click();
  await expect(page.locator('#screen-garage h2')).toHaveText('GARAGE');
  await expect(page.locator('#garage-cash')).not.toHaveText('Wallet $0');
  expect(await fitIssues(page)).toEqual([]);
  await page.screenshot({ path: ART + '/midnight-coast-run-shop.png' });
  const audio = await page.evaluate(function () { return window.MCR.audioState(); });
  expect(['running', 'suspended', 'closed']).toContain(audio);
  expect(errors).toEqual([]);
});

test('camera, drift, nitro, laser and garage', async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'desktop', 'shots on desktop');
  const errors = [];
  track(page, errors);
  await page.goto('/');
  await page.locator('#btn-play').click();
  await page.locator('#btn-start-run').click();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(900);
  await page.screenshot({ path: ART + '/midnight-coast-run-camera.png' });
  await page.keyboard.up('KeyW');
  await page.evaluate(function () { window.MCR.setCamera('north'); });
  const dirs = [['north', -Math.PI / 2], ['east', 0], ['south', Math.PI / 2], ['west', Math.PI]];
  for (let i = 0; i < dirs.length; i++) {
    const name = dirs[i][0];
    const ang = dirs[i][1];
    await page.evaluate(function (angle) { window.MCR.place(940, 1570, angle, 110); }, ang);
    await page.waitForTimeout(180);
    await page.screenshot({ path: ART + '/midnight-coast-run-heading-' + name + '.png' });
  }
  await page.evaluate(function () { window.MCR.setCamera('rotate'); });
  await page.evaluate(function () { window.MCR.place(940, 1570, 0, 160); });
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(650);
  await page.screenshot({ path: ART + '/midnight-coast-run-drift.png' });
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyD');
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.screenshot({ path: ART + '/midnight-coast-run-nitro.png' });
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyW');
  await page.evaluate(function () {
    window.MCR.giveKit();
    window.MCR.debugNight(3);
    const d = window.MCR.snapshot();
    window.MCR.place(d.x, d.y, 0, 0);
  });
  const aim = await page.evaluate(function () {
    const s = window.MCR.snapshot();
    return s.drone ? { x: s.drone.x, y: s.drone.y } : null;
  });
  if (aim) {
    await page.evaluate(function (t) { window.MCR.place(t.x - 90, t.y, 0, 0); }, aim);
  }
  await page.keyboard.down('KeyF');
  await page.waitForTimeout(500);
  await page.screenshot({ path: ART + '/midnight-coast-run-laser.png' });
  await page.keyboard.up('KeyF');
  await page.keyboard.press('Escape');
  await page.locator('#btn-quit').click();
  await page.locator('#btn-garage').click();
  await expect(page.locator('#weapon-list')).toBeVisible();
  await page.screenshot({ path: ART + '/midnight-coast-run-weapons.png' });
  expect(errors).toEqual([]);
});

async function hudGaps(page) {
  return page.evaluate(function () {
    function box(sel) {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    }
    const fuel = box('.bar-wrap span');
    const bars = box('.bars');
    const obj = box('.obj');
    const cell = box('#energy-fill');
    return {
      barsBottom: bars.bottom,
      objTop: obj.top,
      gap: obj.top - bars.bottom,
      cellRight: cell.right,
      objLeft: obj.left,
      fuelTop: fuel.top
    };
  });
}

test('desktop HUD meters sit above the objective', async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'desktop', 'desktop hud');
  const errors = [];
  track(page, errors);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.locator('#btn-play').click();
  await page.locator('#btn-start-run').click();
  await expect(page.locator('#energy-fill')).toBeVisible();
  const gap = await hudGaps(page);
  expect(gap.gap).toBeGreaterThan(6);
  await page.screenshot({ path: ART + '/midnight-coast-run-hud-desktop.png' });
  expect(errors).toEqual([]);
});

test('phone landscape HUD and idle steer wheel', async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'iphone', 'phone landscape hud');
  const errors = [];
  track(page, errors);
  await page.goto('/');
  await page.locator('#btn-play').tap();
  await page.locator('#btn-start-run').tap();
  await expect(page.locator('#steer-idle')).toBeVisible();
  const gap = await hudGaps(page);
  expect(gap.gap).toBeGreaterThan(4);
  const wheel = await page.locator('#steer-idle').boundingBox();
  expect(wheel.width).toBeGreaterThan(80);
  await page.screenshot({ path: ART + '/midnight-coast-run-hud-phone.png' });
  expect(errors).toEqual([]);
});

test('phone landscape touch and layout', async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'iphone', 'landscape phone');
  const errors = [];
  track(page, errors);
  await page.goto('/');
  await expect(page.locator('#btn-play')).toBeVisible();
  expect(await fitIssues(page)).toEqual([]);
  await page.locator('#btn-play').tap();
  await page.locator('#btn-start-run').tap();
  await expect(page.locator('#touch')).toBeVisible();
  await expect(page.locator('#steer-zone')).toBeVisible();
  await expect(page.locator('#t-fire')).toBeVisible();
  await expect(page.locator('#t-drift')).toBeVisible();
  await expect(page.locator('#t-brake')).toBeVisible();
  await page.waitForTimeout(500);
  const speed = await page.evaluate(function () { return window.MCR.snapshot().speed; });
  expect(speed).toBeGreaterThan(8);
  await page.screenshot({ path: ART + '/midnight-coast-run-phone.png' });
  expect(await fitIssues(page)).toEqual([]);
  const body = await page.locator('body').innerText();
  expect(body.toLowerCase()).not.toContain('vice');
  expect(errors).toEqual([]);
});

test('phone portrait touch and layout', async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'iphone-portrait', 'portrait phone');
  const errors = [];
  track(page, errors);
  await page.goto('/');
  await expect(page.locator('h1.logo')).toBeVisible();
  expect(await fitIssues(page)).toEqual([]);
  const playBox = await page.locator('#btn-play').boundingBox();
  expect(playBox.y).toBeGreaterThan(0);
  expect(playBox.y + playBox.height).toBeLessThan(844);
  await page.locator('#btn-play').tap();
  expect(await fitIssues(page)).toEqual([]);
  await page.locator('#btn-start-run').tap();
  await expect(page.locator('#steer-zone')).toBeVisible();
  await expect(page.locator('#t-fire')).toBeVisible();
  await expect(page.locator('#t-nitro')).toBeVisible();
  await page.locator('#t-brake').dispatchEvent('pointerdown');
  await page.waitForTimeout(200);
  expect(await fitIssues(page)).toEqual([]);
  expect(errors).toEqual([]);
});
