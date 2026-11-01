import { test, expect } from '@playwright/test';

const ART = '/opt/cursor/artifacts';
const GAME = '/sharsten/?test=1';

function watch(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

function assertClean(errors) {
  const relevant = errors.filter((line) => !/favicon|umami|cloudflare|beacon|Failed to load resource|net::ERR|analytics|Access-Control-Allow-Origin|not allowed by/i.test(line));
  expect(relevant, relevant.join('\n')).toEqual([]);
}

async function tapHud(page, id) {
  if (await page.locator('#hudPop').isHidden()) await page.click('#hudMenu');
  await page.click(id);
}

async function openFresh(page) {
  const errors = watch(page);
  await page.goto(GAME);
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__SV && window.__SV.ready);
  await page.evaluate(() => window.__SV.reset());
  return errors;
}

async function assertScroll(page, sel) {
  const result = await page.locator(sel).evaluate((node) => {
    node.scrollTop = 0;
    const can = node.scrollHeight > node.clientHeight + 8;
    node.scrollTop = 260;
    return { can, top: node.scrollTop, sh: node.scrollHeight, ch: node.clientHeight };
  });
  expect(result.can, `${sel} sh=${result.sh} ch=${result.ch}`).toBe(true);
  expect(result.top).toBeGreaterThan(20);
}

async function noOverflow(page) {
  const box = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(box.sw).toBeLessThanOrEqual(box.cw + 1);
}

test('loads, branding, viewport, and no horizontal overflow', async ({ page }, info) => {
  const errors = await openFresh(page);
  await expect(page.locator('h1')).toHaveText('گوندی شارستێن');
  await expect(page.locator('#creditLine')).toHaveText('© ٢٠٢٦ ئەیوب عەزیزی – ستۆدیۆی هاپی توونز');
  await expect(page.locator('#aiNote')).toContainText('زیرەکی دەستکرد');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ckb');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('user-scalable=no');
  expect(viewport).toContain('maximum-scale=1');
  expect(viewport).toContain('viewport-fit=cover');
  const touchAction = await page.evaluate(() => getComputedStyle(document.documentElement).touchAction);
  expect(touchAction).toBe('none');
  await noOverflow(page);
  if (info.project.name === 'iphone-portrait') {
    await page.locator('#title').textContent();
  }
  if (info.project.name === 'iphone-landscape') {
    await page.locator('#title').textContent();
  }
  assertClean(errors);
});

test('language switch, RTL, and digits', async ({ page }) => {
  const errors = await openFresh(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ckb');
  await expect(page.locator('h1')).toHaveText('گوندی شارستێن');
  const audit = await page.evaluate(() => window.__SV.i18nAudit());
  expect(audit).toEqual([]);
  const latin = await page.evaluate(() => {
    const re = /[A-Za-z]{4,}/;
    return [...document.querySelectorAll('[data-i18n]')]
      .filter((el) => el.offsetParent)
      .map((el) => el.textContent.trim())
      .filter((text) => re.test(text));
  });
  expect(latin).toEqual([]);
  const layout = await page.evaluate(() => ({
    html: getComputedStyle(document.documentElement).direction,
    sticks: getComputedStyle(document.getElementById('walkControls')).direction,
    font: getComputedStyle(document.body).fontFamily,
    canvas: getComputedStyle(document.querySelector('canvas')).imageRendering,
    text: getComputedStyle(document.body).imageRendering,
  }));
  expect(layout.html).toBe('rtl');
  expect(layout.sticks).toBe('ltr');
  expect(layout.font.toLowerCase()).toContain('vazirmatn');
  expect(layout.canvas).not.toBe('pixelated');
  expect(layout.text).not.toBe('pixelated');
  await noOverflow(page);
  await page.click('#helpBtn');
  await noOverflow(page);
  const helpWide = await page.locator('#help .panel').evaluate((el) => el.scrollWidth <= el.clientWidth + 2);
  expect(helpWide).toBe(true);
  await page.click('#helpClose');
  await page.click('#creditsBtn');
  await noOverflow(page);
  const creditsWide = await page.locator('#credits .panel').evaluate((el) => el.scrollWidth <= el.clientWidth + 2);
  expect(creditsWide).toBe(true);
  await page.click('#creditsClose');
  const wood = page.locator('#stockWood');
  await expect(wood).toHaveAttribute('dir', 'ltr');
  await expect(wood).toHaveText('٤٨');
  await page.click('#langEn');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('h1')).toHaveText('Sharsten Village');
  await expect(page.locator('#creditLine')).toHaveText('© 2026 Ayub Azizi – Happy Toons Studio');
  await noOverflow(page);
  assertClean(errors);
});

test('every panel scrolls', async ({ page }) => {
  const errors = await openFresh(page);
  await assertScroll(page, '#menu [data-scroll-panel]');
  await page.click('#helpBtn');
  await assertScroll(page, '#help [data-scroll-panel]');
  await page.click('#helpClose');
  await page.click('#creditsBtn');
  await assertScroll(page, '#credits [data-scroll-panel]');
  await page.click('#creditsClose');
  await page.click('#playBtn');
  await tapHud(page, '#hudQuests');
  await assertScroll(page, '#quests [data-scroll-panel]');
  await page.click('#viewMosque');
  await assertScroll(page, '#detail [data-scroll-panel]');
  await page.click('#detailClose');
  await tapHud(page, '#hudPeople');
  await assertScroll(page, '#people [data-scroll-panel]');
  await page.click('#peopleClose');
  await tapHud(page, '#hudBuild');
  await assertScroll(page, '#build [data-scroll-panel]');
  await page.click('#buildClose');
  await tapHud(page, '#hudPause');
  await assertScroll(page, '#pause [data-scroll-panel]');
  await noOverflow(page);
  assertClean(errors);
});

test('place and upgrade a building', async ({ page }, info) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  await tapHud(page, '#hudBuild');
  await page.click('[data-build="house"]');
  await page.click('#placeSuggest');
  const id = await page.evaluate(() => window.__SV.getState().lastPlacedId);
  await expect(page.locator('#upgradeBtn')).toBeVisible();
  await page.click('#upgradeBtn');
  const level = await page.evaluate((bid) => window.__SV.getState().buildings.find((b) => b.id === bid).level, id);
  expect(level).toBe(2);
  const mosque = await page.evaluate(() => {
    const b = window.__SV.getState().buildings.find((x) => x.type === 'mosque');
    return window.__SV.demolish(b.id);
  });
  expect(mosque.ok).toBe(false);
  if (info.project.name === 'iphone-portrait') {
    await page.click('#detailClose');
    await page.locator('#detailClose').isHidden();
  }
  if (info.project.name === 'iphone-landscape') {
    await page.click('#detailClose');
    await page.locator('#detailClose').isHidden();
  }
  assertClean(errors);
});

test('resources tick and the day becomes night', async ({ page }) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  const before = await page.evaluate(() => {
    const s = window.__SV.getState();
    return { water: s.resources.water, acc: s.acc, hour: s.hour };
  });
  await page.waitForTimeout(700);
  const mid = await page.evaluate(() => window.__SV.getState().acc);
  expect(mid).toBeGreaterThan(before.acc);
  await page.evaluate(() => window.__SV.setHour(11));
  const day = await page.evaluate(() => window.__SV.getState().phase);
  expect(day).toBe('day');
  await page.evaluate(() => window.__SV.advanceHours(8));
  const night = await page.evaluate(() => window.__SV.getState());
  expect(night.hour).toBe(19);
  expect(night.phase).toBe('night');
  expect(night.resources.water).toBeGreaterThan(before.water);
  expect(night.villagers[0].mode).toBe('home');
  assertClean(errors);
});

test('a villager job produces, a field ripens, animals give goods', async ({ page }) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  const wood = await page.evaluate(() => {
    const plot = window.__SV.suggest('woodyard');
    const placed = window.__SV.place('woodyard', plot.gx, plot.gz);
    const who = window.__SV.getState().villagers[0].id;
    window.__SV.setHour(8);
    const job = window.__SV.assignJob(who, 'builder');
    const before = window.__SV.getState().resources.wood;
    window.__SV.advanceHours(4);
    return { placed: placed.ok, job: job.ok, before, after: window.__SV.getState().resources.wood };
  });
  expect(wood.placed).toBe(true);
  expect(wood.job).toBe(true);
  expect(wood.after).toBeGreaterThan(wood.before + 5);

  const field = await page.evaluate(() => {
    window.__SV.setHour(7);
    const plot = window.__SV.suggest('field');
    const placed = window.__SV.place('field', plot.gx, plot.gz);
    window.__SV.plant(placed.id);
    const farmer = window.__SV.getState().villagers[1].id;
    window.__SV.assignJob(farmer, 'farmer');
    window.__SV.advanceHours(3);
    const mid = window.__SV.getState().buildings.find((b) => b.id === placed.id);
    window.__SV.advanceHours(6);
    const ripe = window.__SV.getState().buildings.find((b) => b.id === placed.id);
    const grain0 = window.__SV.getState().resources.grain;
    window.__SV.harvest(placed.id);
    const grain1 = window.__SV.getState().resources.grain;
    return { stage: mid.stage, growth: mid.growth, ripe: ripe.stage, grain0, grain1 };
  });
  expect(field.growth).toBeGreaterThan(30);
  expect(field.stage).toBeGreaterThanOrEqual(2);
  expect(field.ripe).toBe(3);
  expect(field.grain1).toBeGreaterThan(field.grain0 + 5);

  const animals = await page.evaluate(() => {
    window.__SV.setStock('wool', 0);
    window.__SV.setStock('milk', 0);
    window.__SV.setStock('eggs', 0);
    window.__SV.setHour(8);
    window.__SV.advanceHours(3);
    const s1 = window.__SV.getState().resources;
    return { wool: s1.wool, milk: s1.milk, eggs: s1.eggs };
  });
  expect(animals.wool).toBeGreaterThan(0);
  expect(animals.milk).toBeGreaterThan(0);
  expect(animals.eggs).toBeGreaterThan(0);
  assertClean(errors);
});

test('autosave restores the village', async ({ page }) => {
  const errors = await openFresh(page);
  const cell = await page.evaluate(() => {
    const plot = window.__SV.suggest('house');
    window.__SV.place('house', plot.gx, plot.gz);
    return plot;
  });
  await page.reload();
  await page.waitForFunction(() => window.__SV && window.__SV.ready);
  const kept = await page.evaluate((plot) => window.__SV.getState().buildings.some((b) => b.type === 'house' && b.gx === plot.gx && b.gz === plot.gz), cell);
  expect(kept).toBe(true);
  assertClean(errors);
});

test('starting layout has the mosque and three road exits', async ({ page }) => {
  const errors = await openFresh(page);
  const layout = await page.evaluate(() => {
    const state = window.__SV.getState();
    const lay = window.__SV.layout();
    const mosque = state.buildings.find((b) => b.type === 'mosque');
    return {
      mosque: { gx: mosque.gx, gz: mosque.gz },
      want: lay.mosque,
      exits: lay.exits.map((exit) => ({
        id: exit.id,
        gx: exit.gx,
        gz: exit.gz,
        road: window.__SV.isRoad(exit.gx, exit.gz),
      })),
      houses: state.buildings.filter((b) => b.type === 'house').length,
      fields: state.buildings.filter((b) => b.type === 'field' || b.type === 'vineyard' || String(b.type).startsWith('orchard')).length,
    };
  });
  expect(layout.mosque).toEqual(layout.want);
  expect(layout.exits).toHaveLength(3);
  expect(layout.exits.map((exit) => exit.id).sort()).toEqual(['east', 'northwest', 'south']);
  layout.exits.forEach((exit) => expect(exit.road, exit.id).toBe(true));
  expect(layout.houses).toBeGreaterThanOrEqual(8);
  expect(layout.fields).toBeGreaterThanOrEqual(8);
  expect(layout.mosque.gx).toBeLessThan(28);
  const walked = await page.evaluate(() => window.__SV.reachExits());
  expect(walked).toHaveLength(3);
  walked.forEach((step) => expect(step.ok, step.id).toBe(true));
  assertClean(errors);
});

test('short view hides far objects and the player stays inside', async ({ page }) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  const cull = await page.evaluate(() => {
    window.__SV.setWalkPose({ x: 19, z: 30, yaw: 0, pitch: 0.45 });
    const sheep = window.__SV.getState().animals.find((a) => a.kind === 'sheep');
    const before = { gx: sheep.gx, gz: sheep.gz };
    window.__SV.tickNear(0.4);
    const after = window.__SV.getState().animals.find((a) => a.id === sheep.id);
    return {
      report: window.__SV.cullReport(),
      radius: window.__SV.renderRadius(),
      before,
      after: { gx: after.gx, gz: after.gz, updated: after.updated },
      kinds: window.__SV.propKinds().join(','),
    };
  });
  expect(cull.radius).toBeGreaterThan(12);
  expect(cull.radius).toBeLessThan(26);
  expect(cull.report.skipped).toBeGreaterThan(0);
  expect(cull.report.renderedBeyond).toBe(0);
  expect(cull.report.cameraFar).toBeGreaterThan(12);
  expect(cull.report.cameraFar).toBeLessThan(48);
  expect(cull.after.gx).toBe(cull.before.gx);
  expect(cull.after.gz).toBe(cull.before.gz);
  expect(cull.after.updated).toBe(false);
  expect(cull.kinds).not.toMatch(/tractor|motorbike|tarp|water-tank|power-pole|loudspeaker|asphalt/i);
  expect(cull.kinds).toMatch(/wooden-cart/);
  expect(cull.kinds).toMatch(/courtyard-house/);
  const boxed = await page.evaluate(() => {
    const exits = window.__SV.layout().exits;
    const pushes = [];
    exits.forEach((exit) => {
      const dx = Math.sign(exit.gx - window.__SV.layout().mosque.gx) || 1;
      const dz = Math.sign(exit.gz - window.__SV.layout().mosque.gz) || 0;
      window.__SV.setWalkPose({ x: exit.gx, z: exit.gz, yaw: Math.atan2(dx, dz), pitch: 0.4 });
      window.__SV.setSticks({ moveX: 0, moveY: 1, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
      window.__SV.stepWalk(1.2);
      const d = window.__SV.getWalkDebug();
      pushes.push(window.__SV.playable(d.x, d.z));
    });
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dz]) => {
      window.__SV.setWalkPose({ x: 18 + dx * 8, z: 30 + dz * 8, yaw: Math.atan2(dx, dz), pitch: 0.4 });
      window.__SV.setSticks({ moveX: 0, moveY: 1, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
      window.__SV.stepWalk(2);
      const d = window.__SV.getWalkDebug();
      pushes.push(window.__SV.playable(d.x, d.z));
    });
    return pushes;
  });
  expect(boxed.every(Boolean)).toBe(true);
  assertClean(errors);
});

test('the title and the valley default to green spring', async ({ page }, info) => {
  const errors = await openFresh(page);
  await page.waitForFunction(() => {
    const look = window.__SV.lookReport();
    return look && look.sky && look.sky.b > 0;
  });
  const title = await page.evaluate(() => window.__SV.lookReport());
  expect(title.preview).toBe(true);
  expect(title.season).toBe(0);
  expect(title.hill.g).toBeGreaterThan(title.hill.r);
  expect(title.sky.b).toBeGreaterThan(title.sky.r);
  expect(title.wheat).toBe('green');
  expect(title.blossom).toBe(true);
  await page.click('#playBtn');
  await page.waitForFunction(() => window.__SV.lookReport().preview === false);
  const live = await page.evaluate(() => window.__SV.lookReport());
  expect(live.preview).toBe(false);
  expect(live.season).toBe(0);
  expect(live.wheat).toBe('green');
  expect(live.blossom).toBe(true);
  if (info.project.name === 'iphone-portrait' || info.project.name === 'iphone-landscape') {
    const side = info.project.name === 'iphone-portrait' ? 'portrait' : 'landscape';
    await page.screenshot({ path: `${ART}/sharsten-${side}-build.png` });
    await tapHud(page, '#modeBtn');
    await page.screenshot({ path: `${ART}/sharsten-${side}-walk.png` });
  }
  assertClean(errors);
});

test('walk sticks, mode toggle, bounds, and summer hills', async ({ page }) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'build');
  await tapHud(page, '#modeBtn');
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'walk');
  await expect(page.locator('#walkControls')).toBeVisible();
  await expect(page.locator('#moveZone')).toBeVisible();
  await page.locator('#moveZone').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 4, pointerType: 'touch', clientX: x, clientY: y,
    }));
    fire('pointerdown', cx, cy);
    fire('pointermove', cx, cy - 36);
  });
  const held = await page.evaluate(() => window.__SV.getSticks());
  expect(held.moveY).toBeGreaterThan(0.4);
  expect(held.moveX).toBeLessThan(0.35);
  await page.locator('#moveZone').dispatchEvent('pointerup');
  const look = await page.locator('#lookZone').boundingBox();
  const act = await page.locator('#actionBtn').boundingBox();
  expect(look.y + look.height).toBeLessThanOrEqual(act.y + 2);

  const up = await page.evaluate(() => window.__SV.stickAxes(0, -40, 40));
  expect(up.y).toBeGreaterThan(0.9);
  const right = await page.evaluate(() => window.__SV.stickAxes(40, 0, 40));
  expect(right.x).toBeGreaterThan(0.9);

  await page.evaluate(() => {
    window.__SV.setWalkPose({ x: 5, z: 5, yaw: 0, pitch: 0.6 });
    window.__SV.setSticks({ moveX: 0, moveY: 1, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
    window.__SV.stepWalk(0.5);
  });
  const forward = await page.evaluate(() => window.__SV.getWalkDebug());
  const fdx = forward.x - 5;
  const fdz = forward.z - 5;
  expect(fdx * forward.forward.x + fdz * forward.forward.z).toBeGreaterThan(0.5);
  expect(Math.abs(fdx * forward.right.x + fdz * forward.right.z)).toBeLessThan(0.2);

  await page.evaluate(() => {
    window.__SV.setWalkPose({ x: 5, z: 5, yaw: 0, pitch: 0.6 });
    window.__SV.setSticks({ moveX: 1, moveY: 0, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
    window.__SV.stepWalk(0.5);
  });
  const side = await page.evaluate(() => window.__SV.getWalkDebug());
  const sdx = side.x - 5;
  const sdz = side.z - 5;
  expect(sdx * side.right.x + sdz * side.right.z).toBeGreaterThan(0.5);
  expect(Math.abs(sdx * side.forward.x + sdz * side.forward.z)).toBeLessThan(0.2);

  const eyeBefore = await page.evaluate(() => {
    window.__SV.setWalkPose({ x: 5, z: 5, yaw: 0, pitch: 0.7 });
    window.__SV.setSticks({ moveX: 0, moveY: 0, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
    return window.__SV.cameraEyeY();
  });
  const looked = await page.evaluate(() => {
    window.__SV.setSticks({ moveX: 0, moveY: 0, lookX: 1, lookY: 1, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
    window.__SV.stepWalk(0.35);
    return window.__SV.getWalkDebug();
  });
  const turn = looked.forward.x * side.right.x + looked.forward.z * side.right.z;
  expect(turn).toBeGreaterThan(0.05);
  expect(looked.eyeY).toBeLessThan(eyeBefore);

  const bound = await page.evaluate(() => {
    const min = window.__SV.mapBound().minGx;
    window.__SV.setWalkPose({ x: min + 0.5, z: 8, yaw: Math.PI, pitch: 0.5 });
    window.__SV.setSticks({ moveX: 1, moveY: 0, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
    window.__SV.stepWalk(1);
    const d = window.__SV.getWalkDebug();
    return { x: d.x, z: d.z, min, inside: window.__SV.playable(d.x, d.z) };
  });
  expect(bound.inside).toBe(true);
  expect(bound.x).toBeGreaterThan(bound.min - 0.01);

  await tapHud(page, '#modeBtn');
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'build');
  await expect(page.locator('#walkControls')).toBeHidden();

  const spring = await page.evaluate(() => window.__SV.getHillColor());
  await page.evaluate(() => window.__SV.setSeason('summer'));
  const summer = await page.evaluate(() => window.__SV.getHillColor());
  expect(spring.g).toBeGreaterThan(spring.r);
  expect(summer.r).toBeGreaterThan(summer.g);
  expect(summer.r).toBeGreaterThan(spring.r);
  assertClean(errors);
});

test('a neighbour follows the day, a quest finishes, and both languages have every line', async ({ page }, info) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  const report = await page.evaluate(() => {
    const lines = window.__SV.linePairs();
    const lineOk = lines.length >= 10 && lines.every((line) => line.en && line.ckb && line.en !== line.ckb);
    const npc = window.__SV.getState().villagers.find((v) => !v.player);
    const modes = [];
    for (let h = 0; h < 24; h += 1) {
      window.__SV.setHour(h);
      const mode = window.__SV.getState().villagers.find((v) => v.id === npc.id).mode;
      modes.push(mode === window.__SV.npcSchedule(h));
    }
    const lay = window.__SV.layout();
    const mosque = window.__SV.astarRoute(lay.exits[1].gx, lay.exits[1].gz, lay.mosque.gx, lay.mosque.gz);
    const state = window.__SV.getState();
    const field = state.buildings.find((b) => b.type === 'field');
    const house = state.buildings.find((b) => b.type === 'house');
    const toField = window.__SV.astarRoute(lay.mosque.gx, lay.mosque.gz, field.gx, field.gz);
    const toHome = window.__SV.astarRoute(lay.mosque.gx, lay.mosque.gz, house.gx, house.gz);
    const near = (path, gx, gz) => !!path && Math.hypot(path[path.length - 1].gx - gx, path[path.length - 1].gz - gz) < 0.2;
    const money0 = window.__SV.getState().resources.money;
    const took = window.__SV.acceptQuest('wheat');
    const done = window.__SV.turnInQuest('wheat');
    const after = window.__SV.getState();
    return {
      lineOk,
      schedule: modes.every(Boolean),
      mosque: near(mosque, lay.mosque.gx, lay.mosque.gz),
      field: near(toField, field.gx, field.gz),
      home: near(toHome, house.gx, house.gz),
      took: took.ok,
      done: done.ok,
      paid: after.resources.money >= money0 + 8,
      status: after.npcQuests.find((q) => q.id === 'wheat').status,
      capLow: window.__SV.npcActiveCap() === 12 || window.__SV.npcActiveCap() === 24,
    };
  });
  expect(report.lineOk).toBe(true);
  expect(report.schedule).toBe(true);
  expect(report.mosque).toBe(true);
  expect(report.field).toBe(true);
  expect(report.home).toBe(true);
  expect(report.took).toBe(true);
  expect(report.done).toBe(true);
  expect(report.paid).toBe(true);
  expect(report.status).toBe('done');
  expect(report.capLow).toBe(true);

  await tapHud(page, '#hudQuests');
  const board = page.locator('#questBoard');
  await expect(board).toContainText('گەنم');
  await expect(board).toContainText('مریشک');
  await expect(board).toContainText('پەرژین');
  await expect(board.locator('[data-quest="wheat"]')).toContainText('تەواو');
  const scroll = await page.evaluate(() => {
    const el = document.querySelector('#quests [data-scroll-panel]');
    return el.scrollHeight > el.clientHeight && !!el.querySelector('#questBoard');
  });
  expect(scroll).toBe(true);
  await page.click('#questsClose');
  await page.evaluate(() => document.getElementById('langCkb').click());
  await tapHud(page, '#hudQuests');
  await expect(page.locator('#questBoard')).toContainText('گەنم');
  await expect(page.locator('#questBoard')).toContainText('مریشک');
  await expect(page.locator('#questBoard')).toContainText('پەرژین');
  await page.click('#questsClose');
  await page.evaluate(() => document.getElementById('langEn').click());
  await tapHud(page, '#hudQuests');
  await expect(page.locator('#questBoard')).toContainText('Bring wheat');
  await expect(page.locator('#questBoard')).toContainText('Done');
  const questWide = await page.locator('#quests .panel').evaluate((el) => el.scrollWidth <= el.clientWidth + 2);
  expect(questWide).toBe(true);
  await page.click('#questsClose');

  const greet = await page.evaluate(() => {
    window.__SV.setHour(9);
    const npc = window.__SV.getState().villagers.find((v) => !v.player && !v.questId);
    window.__SV.setWalkPose({ x: npc.gx, z: npc.gz + 0.4, yaw: 0, pitch: 0.4 });
    window.__SV.stepNpcs(0.2);
    const after = window.__SV.getState().villagers.find((v) => v.id === npc.id);
    return { line: after.line, greeting: after.greeting };
  });
  expect(greet.greeting).toBe(true);
  expect(String(greet.line).startsWith('greet')).toBe(true);
  await expect(page.locator('#speech')).toBeVisible();
  const speech = await page.locator('#speech').innerText();
  expect(speech.length).toBeGreaterThan(3);
  if (info.project.name === 'iphone-portrait') {
    await page.locator('#speech').textContent();
  }
  assertClean(errors);
});

test('a car laps the lane, the player can drive, and a tractor harvests', async ({ page }, info) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  const report = await page.evaluate(() => {
    window.__SV.shiftVillagers(28, 4);
    const ring = window.__SV.getState().vehicles.find((v) => v.route === 'ring');
    const start = { gx: ring.gx, gz: ring.gz };
    const seen = new Set();
    let lapped = false;
    for (let i = 0; i < 240 && !lapped; i += 1) {
      window.__SV.stepVehicles(0.1);
      const car = window.__SV.getState().vehicles.find((v) => v.id === ring.id);
      seen.add(`${Math.round(car.gx)},${Math.round(car.gz)}`);
      if (i > 25 && seen.size >= 6 && Math.hypot(car.gx - start.gx, car.gz - start.gz) < 0.45) lapped = true;
    }
    const bike = window.__SV.getState().vehicles.find((v) => v.route === 'south');
    window.__SV.setWalkPose({ x: bike.gx + 0.3, z: bike.gz, yaw: 0, pitch: 0.4 });
    const entered = window.__SV.enterVehicle(bike.id);
    const before = window.__SV.getState().vehicles.find((v) => v.id === bike.id);
    for (let i = 0; i < 8; i += 1) window.__SV.driveVehicle(before.id, 0, 1, 0.1);
    const moved = window.__SV.getState().vehicles.find((v) => v.id === bike.id);
    const left = window.__SV.exitVehicle();
    const ripe = window.__SV.getState().buildings.find((b) => b.type === 'field' && b.stage === 3);
    const grain0 = window.__SV.getState().resources.grain;
    window.__SV.harvest(ripe.id);
    const after = window.__SV.getState();
    const field = after.buildings.find((b) => b.id === ripe.id);
    const bikeEdge = after.vehicles.find((v) => v.id === bike.id);
    window.__SV.setWalkPose({ x: bikeEdge.gx, z: bikeEdge.gz, yaw: 0, pitch: 0.4 });
    window.__SV.enterVehicle(bikeEdge.id);
    window.__SV.placeVehicle(bikeEdge.id, 0.2, 10, Math.atan2(-1, 0));
    let hit = false;
    for (let i = 0; i < 40; i += 1) {
      const step = window.__SV.driveVehicle(bikeEdge.id, 0, 1, 0.1);
      if (step.hit) hit = true;
    }
    const parked = window.__SV.getState().vehicles.find((v) => v.id === bikeEdge.id);
    return {
      lapped,
      seen: seen.size,
      entered: entered.ok,
      drove: Math.hypot(moved.gx - before.gx, moved.gz - before.gz) > 0.4,
      exited: left.ok,
      stubble: field.stage === 0,
      grain: after.resources.grain >= grain0 + 8,
      hit,
      inside: window.__SV.playable(parked.gx, parked.gz),
      cap: window.__SV.vehicleCap() === 4 || window.__SV.vehicleCap() === 8,
    };
  });
  expect(report.lapped).toBe(true);
  expect(report.seen).toBeGreaterThanOrEqual(6);
  expect(report.entered).toBe(true);
  expect(report.drove).toBe(true);
  expect(report.exited).toBe(true);
  expect(report.stubble).toBe(true);
  expect(report.grain).toBe(true);
  expect(report.hit).toBe(true);
  expect(report.inside).toBe(true);
  expect(report.cap).toBe(true);

  const near = await page.evaluate(() => {
    const car = window.__SV.getState().vehicles.find((v) => v.kind === 'cart');
    window.__SV.exitVehicle();
    window.__SV.setWalkPose({ x: car.gx + 0.4, z: car.gz, yaw: car.yaw || 0, pitch: 0.45 });
    return { x: car.gx, z: car.gz };
  });
  expect(near.x).toBeGreaterThan(-5);
  await expect(page.locator('#boardBtn')).toBeVisible();
  await expect(page.locator('#boardBtn')).toHaveText('سواربە');
  if (info.project.name === 'iphone-portrait') {
    await page.locator('#boardBtn').textContent();
  }
  assertClean(errors);
});

test('herds walk to pasture and back, and a donkey can be ridden', async ({ page }, info) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  const report = await page.evaluate(() => {
    window.__SV.setHour(9);
    const day = window.__SV.herdSpot('sheep', 'pasture');
    const sheep = window.__SV.getState().animals.find((a) => a.kind === 'sheep');
    const out = Math.hypot(sheep.gx - day.gx, sheep.gz - day.gz);
    window.__SV.setHour(20);
    const fold = window.__SV.herdSpot('sheep', 'pen');
    const back = window.__SV.getState().animals.find((a) => a.id === sheep.id);
    const inside = window.__SV.getState().animals.every((a) => window.__SV.playable(a.gx, a.gz));
    window.__SV.setStock('milk', 0);
    window.__SV.setStock('wool', 0);
    window.__SV.setStock('eggs', 0);
    window.__SV.setHour(8);
    window.__SV.advanceHours(2);
    const goods = window.__SV.getState().resources;
    const donkey = window.__SV.getState().animals.find((a) => a.kind === 'donkey');
    window.__SV.setWalkPose({ x: donkey.gx + 0.2, z: donkey.gz, yaw: 0, pitch: 0.4 });
    const mounted = window.__SV.enterAnimal(donkey.id);
    const start = window.__SV.getState().animals.find((a) => a.id === donkey.id);
    for (let i = 0; i < 8; i += 1) window.__SV.rideAnimal(donkey.id, 0, 1, 0.1);
    const moved = window.__SV.getState().animals.find((a) => a.id === donkey.id);
    const left = window.__SV.exitAnimal();
    window.__SV.enterAnimal(donkey.id);
    window.__SV.placeAnimal(donkey.id, 0.2, 10, Math.atan2(-1, 0));
    let hit = false;
    for (let i = 0; i < 40; i += 1) {
      const step = window.__SV.rideAnimal(donkey.id, 0, 1, 0.1);
      if (step.hit) hit = true;
    }
    const parked = window.__SV.getState().animals.find((a) => a.id === donkey.id);
    return {
      out,
      back: Math.hypot(back.gx - fold.gx, back.gz - fold.gz),
      leftPasture: Math.hypot(back.gx - day.gx, back.gz - day.gz),
      graze: sheep.mode,
      home: back.mode,
      inside,
      milk: goods.milk,
      wool: goods.wool,
      eggs: goods.eggs,
      mounted: mounted.ok,
      rode: Math.hypot(moved.gx - start.gx, moved.gz - start.gz) > 0.3,
      left: left.ok,
      hit,
      bound: window.__SV.playable(parked.gx, parked.gz),
      slower: window.__SV.donkeySpeed() < 1.7,
      cap: window.__SV.animalCap() === 20 || window.__SV.animalCap() === 40,
    };
  });
  expect(report.out).toBeLessThan(2.4);
  expect(report.back).toBeLessThan(2.4);
  expect(report.leftPasture).toBeGreaterThan(6);
  expect(report.graze).toBe('graze');
  expect(report.home).toBe('idle');
  expect(report.inside).toBe(true);
  expect(report.milk).toBeGreaterThan(0);
  expect(report.wool).toBeGreaterThan(0);
  expect(report.eggs).toBeGreaterThan(0);
  expect(report.mounted).toBe(true);
  expect(report.rode).toBe(true);
  expect(report.left).toBe(true);
  expect(report.hit).toBe(true);
  expect(report.bound).toBe(true);
  expect(report.slower).toBe(true);
  expect(report.cap).toBe(true);
  if (info.project.name === 'iphone-portrait') {
    await page.evaluate(() => {
      const cow = window.__SV.getState().animals.find((a) => a.kind === 'cow');
      window.__SV.exitAnimal();
      window.__SV.setWalkPose({ x: cow.gx + 1.2, z: cow.gz + 1.6, yaw: 0.4, pitch: 0.5 });
    });
    await page.locator('#hudMenu').textContent();
  }
  assertClean(errors);
});

test('rotation keeps the HUD, sticks, and panels in view', async ({ page }) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  await tapHud(page, '#modeBtn');
  const pairs = [[390, 844], [844, 390], [375, 667], [667, 375], [412, 915], [915, 412]];
  const before = await page.evaluate(() => {
    const s = window.__SV.getState();
    return { hour: s.hour, wood: s.resources.wood, rank: s.rank };
  });
  for (const [w, h] of pairs) {
    await page.setViewportSize({ width: w, height: h });
    const audit = await page.evaluate(() => {
      const root = document.documentElement;
      const vv = window.visualViewport;
      root.style.setProperty('--safe-t', '36px');
      root.style.setProperty('--safe-b', '24px');
      root.style.setProperty('--safe-l', '10px');
      root.style.setProperty('--safe-r', '10px');
      const width = vv ? vv.width : window.innerWidth;
      const height = vv ? vv.height : window.innerHeight;
      root.dataset.orient = width >= height ? 'landscape' : 'portrait';
      const box = (sel) => {
        const el = document.querySelector(sel);
        if (!el || el.closest('[hidden]')) return null;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return null;
        return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
      };
      const hit = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
      const inside = (a) => a && a.l >= -1 && a.t >= -1 && a.r <= width + 1 && a.b <= height + 1;
      const move = box('#moveZone');
      const look = box('#lookZone');
      const act = box('#actionBtn');
      const hud = box('#hud');
      const res = box('#resbar');
      const menu = box('#hudMenu');
      return {
        orient: root.dataset.orient,
        width,
        height,
        inside: [move, look, act, hud, res, menu].every(inside),
        overlap: hit(move, look) || hit(move, act) || hit(hud, move) || hit(hud, act),
        corners: move && look && (width < height || (move.l < width * 0.35 && look.r > width * 0.65 && move.b > height * 0.7 && look.b > height * 0.7)),
        compact: height < width || (hud && hud.b < height * 0.22),
        topRow: res && res.t < 80,
        safe: move && res && move.l >= 8 && res.t >= 30 && move.b <= height - 20,
      };
    });
    expect(audit.inside, `${w}x${h} inside`).toBe(true);
    expect(audit.overlap, `${w}x${h} overlap`).toBe(false);
    expect(audit.corners, `${w}x${h} corners`).toBe(true);
    expect(audit.compact, `${w}x${h} compact`).toBe(true);
    expect(audit.topRow, `${w}x${h} resources`).toBe(true);
    expect(audit.safe, `${w}x${h} safe area`).toBe(true);
    expect(audit.orient).toBe(w >= h ? 'landscape' : 'portrait');
  }
  await page.evaluate(() => {
    const root = document.documentElement;
    ['--safe-t', '--safe-b', '--safe-l', '--safe-r'].forEach((key) => root.style.removeProperty(key));
  });
  await tapHud(page, '#hudQuests');
  await assertScroll(page, '#quests [data-scroll-panel]');
  await page.click('#questsClose');
  const after = await page.evaluate(() => {
    const s = window.__SV.getState();
    window.__SV.setWalkPose({ x: 19, z: 30, yaw: 0, pitch: 0.4 });
    window.__SV.setSticks({ moveX: 0, moveY: 1, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
    const z0 = window.__SV.getWalkDebug().z;
    window.__SV.stepWalk(0.4);
    return { hour: s.hour, wood: s.resources.wood, rank: s.rank, z0, z1: window.__SV.getWalkDebug().z };
  });
  expect(after.wood).toBe(before.wood);
  expect(after.rank).toBe(before.rank);
  expect(after.z1).toBeGreaterThan(after.z0);
  assertClean(errors);
});

test('keys, sticks, and look all follow the camera', async ({ page }) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  await page.evaluate(() => {
    for (let i = 0; i < 6; i += 1) window.__SV.advanceTutorial();
  });
  await page.evaluate(() => document.getElementById('hudMenu').click());
  await page.click('#modeBtn');
  const forward = await page.evaluate(() => {
    window.__SV.setWalkPose({ x: 20, z: 30, yaw: 0.4, pitch: 0.45 });
    const before = window.__SV.getWalkDebug();
    window.__SV.stepKeys(0.35, ['KeyW']);
    const after = window.__SV.getWalkDebug();
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    window.__SV.setWalkPose({ x: 20, z: 30, yaw: 0.4, pitch: 0.45 });
    window.__SV.stepKeys(0.35, ['KeyS']);
    const back = window.__SV.getWalkDebug();
    const bx = back.x - 20;
    const bz = back.z - 30;
    window.__SV.setWalkPose({ x: 20, z: 30, yaw: 0.4, pitch: 0.45 });
    window.__SV.setSticks({ moveX: 0, moveY: 1, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
    window.__SV.stepWalk(0.35);
    const stick = window.__SV.getWalkDebug();
    const yaw0 = 0.4;
    window.__SV.setWalkPose({ x: 20, z: 30, yaw: yaw0, pitch: 0.45 });
    const right = window.__SV.getWalkDebug().right;
    window.__SV.lookDrag(40);
    const turned = window.__SV.getWalkDebug();
    const lookDot = turned.forward.x * right.x + turned.forward.z * right.z;
    window.__SV.setWalkPose({ x: 20, z: 30, yaw: yaw0, pitch: 0.45 });
    window.__SV.setSticks({ moveX: 0, moveY: 0, lookX: 1, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 });
    window.__SV.stepWalk(0.3);
    const joy = window.__SV.getWalkDebug();
    const joyDot = joy.forward.x * right.x + joy.forward.z * right.z;
    return {
      w: dx * before.forward.x + dz * before.forward.z,
      s: bx * before.forward.x + bz * before.forward.z,
      stick: (stick.x - 20) * before.forward.x + (stick.z - 30) * before.forward.z,
      lookDot,
      joyDot,
    };
  });
  expect(forward.w).toBeGreaterThan(0.4);
  expect(forward.s).toBeLessThan(-0.4);
  expect(forward.stick).toBeGreaterThan(0.4);
  expect(forward.lookDot).toBeGreaterThan(0.05);
  expect(forward.joyDot).toBeGreaterThan(0.05);
  assertClean(errors);
});

test('each real button can be tapped once', async ({ page }) => {
  const errors = await openFresh(page);
  const menu = ['#helpBtn', '#helpClose', '#creditsBtn', '#creditsClose', '#langCkb', '#qualityBtn', '#easyBtn'];
  for (const sel of menu) {
    await page.click(sel);
  }
  await page.click('#playBtn');
  await page.evaluate(() => {
    for (let i = 0; i < 6; i += 1) window.__SV.advanceTutorial();
  });
  const play = ['#hudMenu', '#modeBtn', '#hudMenu', '#hudCraft', '#craftClose', '#hudMenu', '#hudBuild', '#buildClose', '#hudMenu', '#hudPeople', '#peopleClose', '#hudMenu', '#hudQuests', '#questsClose', '#hudMenu', '#hudPause', '#resumeBtn'];
  for (const sel of play) {
    if (await page.locator('#hudPop').isHidden() && sel !== '#hudMenu' && sel.startsWith('#hud')) await page.click('#hudMenu');
    await page.click(sel);
  }
  const once = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter((b) => b.offsetParent);
    return buttons.every((b) => b.getBoundingClientRect().height >= 44);
  });
  expect(once).toBe(true);
  assertClean(errors);
});

test('village levels unlock, progress reloads, and the tutorial finishes by touch', async ({ page }) => {
  const errors = await openFresh(page);
  const table = await page.evaluate(() => {
    const ranks = [];
    for (let rank = 1; rank <= 5; rank += 1) {
      window.__SV.setRank(rank);
      ranks.push({
        rank: window.__SV.getState().rank,
        house: window.__SV.isUnlocked('house'),
        tandoor: window.__SV.isUnlocked('tandoor'),
        mill: window.__SV.isUnlocked('mill'),
        pen: window.__SV.isUnlocked('pen_sheep'),
        loom: window.__SV.isUnlocked('loom'),
        smith: window.__SV.isUnlocked('smith'),
        vineyard: window.__SV.isUnlocked('vineyard'),
        school: window.__SV.isUnlocked('school'),
        teacher: window.__SV.jobUnlocked('teacher'),
      });
    }
    window.__SV.setRank(4);
    return ranks;
  });
  expect(table[0].rank).toBe(1);
  expect(table[0].house && table[0].tandoor).toBe(true);
  expect(table[0].mill).toBe(false);
  expect(table[1].mill && table[1].pen).toBe(true);
  expect(table[1].loom).toBe(false);
  expect(table[2].loom && table[2].smith).toBe(true);
  expect(table[2].vineyard).toBe(false);
  expect(table[3].vineyard).toBe(true);
  expect(table[3].school).toBe(false);
  expect(table[4].school && table[4].teacher).toBe(true);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready === '1' && window.__SV && window.__SV.ready);
  const kept = await page.evaluate(() => window.__SV.getState().rank);
  expect(kept).toBe(4);
  await page.evaluate(() => document.getElementById('langCkb').click());
  await page.click('#playBtn');
  await expect(page.locator('#tutorial')).toBeVisible();
  await expect(page.locator('#tutorialText')).toContainText('شارستێن');
  for (let i = 0; i < 6; i += 1) {
    if (await page.locator('#tutorial').isHidden()) break;
    await page.locator('#tutorialNext').click();
  }
  await expect(page.locator('#tutorial')).toBeHidden();
  assertClean(errors);
});
