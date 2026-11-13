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
      else if (Math.abs(diff) > 0.85) { gas = 0; brake = 0; }
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
  await expect(page.locator('#t-gas')).toBeVisible();
  const before = await page.evaluate(function () { return window.MCR.snapshot().speed; });
  await page.evaluate(function () {
    const el = document.querySelector('#t-gas');
    el.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', isPrimary: true, button: 0, clientX: 20, clientY: 20
    }));
  });
  await page.waitForTimeout(450);
  const after = await page.evaluate(function () { return window.MCR.snapshot().speed; });
  expect(after).toBeGreaterThan(before + 8);
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
  await expect(page.locator('#t-left')).toBeVisible();
  await expect(page.locator('#t-nitro')).toBeVisible();
  await page.locator('#t-brake').dispatchEvent('pointerdown');
  await page.waitForTimeout(200);
  expect(await fitIssues(page)).toEqual([]);
  expect(errors).toEqual([]);
});
