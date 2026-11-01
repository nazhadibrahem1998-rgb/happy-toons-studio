import { test, expect } from '@playwright/test';

const ART = '/opt/cursor/artifacts';

function watch(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const where = (msg.location() && msg.location().url) || '';
    const text = msg.text();
    if (/cloudflareinsights|cloud\.umami\.is|cdn-cgi\/rum/i.test(`${where}\n${text}`)) return;
    errors.push(text);
  });
  return errors;
}

function overlaps(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;
}

async function hold(page, id, dx, dy, pointerId) {
  await page.evaluate(({ id, dx, dy, pointerId }) => {
    const el = document.getElementById(id);
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y,
    }));
    fire('pointerdown', cx, cy);
    fire('pointermove', cx + dx, cy + dy);
  }, { id, dx, dy, pointerId });
}

async function release(page, id, pointerId) {
  await page.evaluate(({ id, pointerId }) => {
    document.getElementById(id).dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, pointerId, pointerType: 'touch', isPrimary: true,
    }));
  }, { id, pointerId });
}

test('right look stick turns the camera and stays clear of Jump', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'touch phones only');
  test.setTimeout(120000);
  const errors = watch(page);
  await page.goto('/block-tower/?test=1');
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__BT && window.__BT.ready);
  await page.evaluate(() => window.__BT.setRivals('off'));
  await page.click('#playBtn');
  const sizes = info.project.name === 'android'
    ? [[412, 915], [915, 412]]
    : [[390, 844], [844, 390]];

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => { window.__BT.resetFeet(); window.__BT.setYaw(0); });
    const look = await page.locator('#lookZone').boundingBox();
    const jump = await page.locator('#jumpBtn').boundingBox();
    const move = await page.locator('#stickZone').boundingBox();
    const hud = await page.locator('#hud').boundingBox();
    expect(look, `${width}x${height} look stick`).toBeTruthy();
    expect(overlaps(look, jump), `${width}x${height} overlaps jump`).toBe(false);
    expect(overlaps(look, move), `${width}x${height} overlaps move`).toBe(false);
    expect(overlaps(look, hud), `${width}x${height} overlaps hud`).toBe(false);
    expect(look.y + look.height, `${width}x${height} above jump`).toBeLessThanOrEqual(jump.y + 2);
    expect(look.x, `${width}x${height} on the right`).toBeGreaterThan(width * 0.45);
    expect(jump.x + jump.width).toBeLessThanOrEqual(width + 1);
    expect(jump.y + jump.height).toBeLessThanOrEqual(height + 1);
    if (info.project.name === 'webkit') {
      const name = width > height ? 'screenshot_look_landscape.png' : 'screenshot_look_portrait.png';
      await page.screenshot({ path: `${ART}/${name}` });
    }

    await hold(page, 'lookZone', 36, 0, 21);
    await page.waitForTimeout(280);
    await release(page, 'lookZone', 21);
    const yawRight = await page.evaluate(() => window.__BT.cameraInfo().yaw);
    expect(yawRight, `${width}x${height} look right`).toBeGreaterThan(0.2);

    await page.evaluate(() => window.__BT.setYaw(0));
    await hold(page, 'lookZone', -36, 0, 22);
    await page.waitForTimeout(280);
    await release(page, 'lookZone', 22);
    expect(await page.evaluate(() => window.__BT.cameraInfo().yaw), `${width}x${height} look left`).toBeLessThan(-0.2);

    await page.evaluate(() => window.__BT.setYaw(0));
    const pitchBefore = await page.evaluate(() => window.__BT.cameraInfo().pitch);
    await hold(page, 'lookZone', 0, -36, 23);
    await page.waitForTimeout(280);
    await release(page, 'lookZone', 23);
    expect(await page.evaluate(() => window.__BT.cameraInfo().pitch), `${width}x${height} look up`).toBeLessThan(pitchBefore - 0.04);

    await page.evaluate(() => window.__BT.setYaw(0));
    const pitchMid = await page.evaluate(() => window.__BT.cameraInfo().pitch);
    await hold(page, 'lookZone', 0, 36, 24);
    await page.waitForTimeout(280);
    await release(page, 'lookZone', 24);
    expect(await page.evaluate(() => window.__BT.cameraInfo().pitch), `${width}x${height} look down`).toBeGreaterThan(pitchMid + 0.04);

    await page.evaluate(() => { window.__BT.resetFeet(); window.__BT.setYaw(0); });
    await hold(page, 'lookZone', 36, 0, 25);
    await page.waitForTimeout(300);
    await release(page, 'lookZone', 25);
    const yaw = await page.evaluate(() => window.__BT.cameraInfo().yaw);
    await page.evaluate(() => window.__BT.resetFeet());
    const before = await page.evaluate(() => window.__BT.getState());
    await hold(page, 'stickZone', 0, -36, 26);
    await page.waitForTimeout(260);
    await release(page, 'stickZone', 26);
    const after = await page.evaluate(() => window.__BT.getState());
    const dot = (after.x - before.x) * Math.cos(yaw) + (after.z - before.z) * Math.sin(yaw);
    expect(dot, `${width}x${height} forward after turn`).toBeGreaterThan(0.2);

    await page.evaluate((angle) => {
      window.__BT.resetFeet();
      window.__BT.setYaw(angle);
      window.__BT.freezeCam(true);
    }, yaw);
    const screen0 = await page.evaluate(() => {
      const s = window.__BT.getState();
      return window.__BT.project(s.x, s.y + 1, s.z).x;
    });
    await hold(page, 'stickZone', -36, 0, 27);
    await page.waitForTimeout(220);
    const screen1 = await page.evaluate(() => {
      const s = window.__BT.getState();
      return window.__BT.project(s.x, s.y + 1, s.z).x;
    });
    await release(page, 'stickZone', 27);
    await page.evaluate(() => window.__BT.freezeCam(false));
    expect(screen1, `${width}x${height} screen left`).toBeLessThan(screen0 - 4);
  }

  await page.setViewportSize({ width: sizes[1][0], height: sizes[1][1] });
  await page.evaluate(() => { window.__BT.resetFeet(); window.__BT.setYaw(0); });
  const start = await page.evaluate(() => ({ y: window.__BT.getState().y, yaw: window.__BT.cameraInfo().yaw }));
  await page.evaluate(() => {
    function press(id, dx, dy, pointerId) {
      const el = document.getElementById(id);
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y,
      }));
      fire('pointerdown', cx, cy);
      if (id !== 'jumpBtn') fire('pointermove', cx + dx, cy + dy);
    }
    press('stickZone', 0, -34, 31);
    press('lookZone', 34, 0, 32);
    press('jumpBtn', 0, 0, 33);
  });
  await page.waitForTimeout(280);
  const together = await page.evaluate(() => ({
    y: window.__BT.getState().y,
    x: window.__BT.getState().x,
    yaw: window.__BT.cameraInfo().yaw,
  }));
  await page.evaluate(() => {
    for (const [id, pointerId] of [['stickZone', 31], ['lookZone', 32], ['jumpBtn', 33]]) {
      document.getElementById(id).dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, pointerId, pointerType: 'touch', isPrimary: true,
      }));
    }
  });
  expect(together.y).toBeGreaterThan(start.y + 0.2);
  expect(together.x).toBeGreaterThan(0.12);
  expect(together.yaw).toBeGreaterThan(start.yaw + 0.12);
  const relevant = errors.filter((line) => !/favicon|Download the React DevTools|cloudflareinsights|cdn-cgi\/rum|Access-Control-Allow-Origin/i.test(line));
  expect(relevant, relevant.join('\n')).toEqual([]);
});
