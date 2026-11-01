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
  await expect(page.locator('h1')).toHaveText('Sharsten Village');
  await expect(page.locator('#creditLine')).toHaveText('© Ayub Azizi – Happy Toons Studio');
  await expect(page.locator('#aiNote')).toContainText('Made with AI assistance');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('user-scalable=no');
  expect(viewport).toContain('maximum-scale=1');
  expect(viewport).toContain('viewport-fit=cover');
  const touchAction = await page.evaluate(() => getComputedStyle(document.documentElement).touchAction);
  expect(touchAction).toBe('none');
  await noOverflow(page);
  if (info.project.name === 'iphone-portrait') {
    await page.screenshot({ path: `${ART}/sharsten-portrait-menu.png` });
  }
  if (info.project.name === 'iphone-landscape') {
    await page.screenshot({ path: `${ART}/sharsten-landscape-menu.png` });
  }
  assertClean(errors);
});

test('language switch, RTL, and digits', async ({ page }) => {
  const errors = await openFresh(page);
  await page.click('#langCkb');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ckb');
  await expect(page.locator('h1')).toHaveText('گوندی شارستێن');
  const wood = page.locator('#stockWood');
  await expect(wood).toHaveAttribute('dir', 'ltr');
  await expect(wood).toHaveText('٤٨');
  await page.click('#langEn');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('h1')).toHaveText('Sharsten Village');
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
  await page.click('#hudQuests');
  await assertScroll(page, '#quests [data-scroll-panel]');
  await page.click('#viewMosque');
  await assertScroll(page, '#detail [data-scroll-panel]');
  await page.click('#detailClose');
  await page.click('#hudPeople');
  await assertScroll(page, '#people [data-scroll-panel]');
  await page.click('#peopleClose');
  await page.click('#hudBuild');
  await assertScroll(page, '#build [data-scroll-panel]');
  await page.click('#buildClose');
  await page.click('#hudPause');
  await assertScroll(page, '#pause [data-scroll-panel]');
  await noOverflow(page);
  assertClean(errors);
});

test('place and upgrade a building', async ({ page }, info) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  await page.click('#hudBuild');
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
    await page.screenshot({ path: `${ART}/sharsten-portrait.png` });
  }
  if (info.project.name === 'iphone-landscape') {
    await page.click('#detailClose');
    await page.screenshot({ path: `${ART}/sharsten-landscape.png` });
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
  expect(cull.radius).toBeGreaterThan(6);
  expect(cull.radius).toBeLessThan(10);
  expect(cull.report.skipped).toBeGreaterThan(0);
  expect(cull.report.renderedBeyond).toBe(0);
  expect(cull.report.cameraFar).toBeLessThan(cull.radius + 12);
  expect(cull.after.gx).toBe(cull.before.gx);
  expect(cull.after.gz).toBe(cull.before.gz);
  expect(cull.after.updated).toBe(false);
  expect(cull.kinds).not.toMatch(/motorbike|tractor|car|tarp|water-tank|power-pole|loudspeaker|asphalt/i);
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

test('walk sticks, mode toggle, bounds, and summer hills', async ({ page }) => {
  const errors = await openFresh(page);
  await page.click('#playBtn');
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'build');
  await page.click('#modeBtn');
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

  await page.click('#modeBtn');
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

  await page.click('#hudQuests');
  const board = page.locator('#questBoard');
  await expect(board).toContainText('Bring wheat');
  await expect(board).toContainText('Find the lost chicken');
  await expect(board).toContainText('Fix the fence');
  await expect(board.locator('[data-quest="wheat"]')).toContainText('Done');
  const scroll = await page.evaluate(() => {
    const el = document.querySelector('#quests [data-scroll-panel]');
    return el.scrollHeight > el.clientHeight && !!el.querySelector('#questBoard');
  });
  expect(scroll).toBe(true);
  await page.click('#questsClose');
  await page.evaluate(() => document.getElementById('langCkb').click());
  await page.click('#hudQuests');
  await expect(page.locator('#questBoard')).toContainText('گەنم');
  await expect(page.locator('#questBoard')).toContainText('مریشک');
  await expect(page.locator('#questBoard')).toContainText('پەرژین');
  await page.click('#questsClose');
  await page.evaluate(() => document.getElementById('langEn').click());

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
    await page.screenshot({ path: `${ART}/sharsten-npc-greet.png` });
  }
  assertClean(errors);
});
