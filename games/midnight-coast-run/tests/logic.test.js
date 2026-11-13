'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const City = require('../js/city.js');
const Sim = require('../js/sim.js');

const root = path.join(__dirname, '..');

test('clock labels stay clear of forbidden words and format', function () {
  assert.equal(Sim.formatClock(21.5 * 3600), '09:30 PM');
  assert.equal(Sim.formatClock(24 * 3600), '12:00 AM');
  assert.equal(Sim.formatClock(22 * 3600 + 5 * 60), '10:05 PM');
  assert.match(Sim.formatLeft(21 * 3600), /3h 00m left/);
});

test('stars reward a clean, early finish', function () {
  assert.equal(Sim.calcStars({ cleared: false, timeLeft: 100, timeTotal: 100, bumps: 0, sides: 1, near: 9 }), 0);
  assert.equal(Sim.calcStars({ cleared: true, timeLeft: 10, timeTotal: 100, bumps: 8, sides: 0, near: 0 }), 1);
  assert.equal(Sim.calcStars({ cleared: true, timeLeft: 25, timeTotal: 100, bumps: 3, sides: 0, near: 0 }), 2);
  assert.equal(Sim.calcStars({ cleared: true, timeLeft: 40, timeTotal: 100, bumps: 1, sides: 1, near: 0 }), 3);
  assert.equal(Sim.calcStars({ cleared: true, timeLeft: 40, timeTotal: 100, bumps: 1, sides: 0, near: 4 }), 3);
});

test('city spots sit on open road, away from water and buildings', function () {
  assert.ok(City.SPOTS.length >= 24);
  for (const s of City.SPOTS) {
    assert.ok(s.x > City.WATER_X + 40, s.name);
    assert.ok(s.y > 40 && s.y < City.WORLD_H - 40);
    const hit = City.resolveCar(s.x, s.y, City.CAR_R + 6);
    assert.equal(hit.hit, null, s.name + ' is blocked');
  }
  const hub = City.resolveCar(City.HUB.x, City.HUB.y, City.CAR_R + 8);
  assert.equal(hub.hit, null);
});

test('route stays on the road grid and reaches the goal node', function () {
  const path = City.route(City.HUB.x, City.HUB.y, City.XS[4], City.YS[0]);
  assert.ok(path.length >= 2);
  assert.equal(path[path.length - 1].x, City.XS[4]);
  assert.equal(path[path.length - 1].y, City.YS[0]);
});

test('a car cannot pass through a building', function () {
  const b = City.BUILDINGS[0];
  const state = Sim.createNight(1, { engine: 0, handling: 0, nitro: 0, trunk: 0 });
  state.traffic = [];
  state.x = b.x - 20;
  state.y = b.y + b.h / 2;
  state.angle = 0;
  state.speed = 200;
  for (let i = 0; i < 90; i++) Sim.step(state, { gas: 1, brake: 0, steer: 0, nitro: 0 }, 1 / 60);
  const inside = state.x > b.x && state.x < b.x + b.w && state.y > b.y && state.y < b.y + b.h;
  assert.equal(inside, false);
});

test('sitting in a drop ring completes the delivery', function () {
  const state = Sim.createNight(1, { engine: 0, handling: 0, nitro: 0, trunk: 0 });
  state.traffic = [];
  const job = state.cargo[0];
  state.x = job.x;
  state.y = job.y;
  state.speed = 0;
  const before = state.delivered;
  for (let i = 0; i < 30; i++) Sim.step(state, { gas: 0, brake: 1, steer: 0, nitro: 0 }, 1 / 60);
  assert.ok(state.delivered > before);
  assert.ok(state.earned >= job.pay);
});

test('clearing midnight unlocks endless and banks pay once', function () {
  const save = Sim.defaultSave();
  const state = Sim.createNight(11, save.upg);
  state.traffic = [];
  state.waiting = [];
  state.sideOffer = null;
  state.sideQueue = [];
  const job = state.cargo[0];
  state.cargo = [job];
  state.requiredTotal = 1;
  state.x = job.x;
  state.y = job.y;
  state.speed = 0;
  state.earned = 0;
  for (let i = 0; i < 40; i++) Sim.step(state, { gas: 0, brake: 1, steer: 0, nitro: 0 }, 1 / 60);
  assert.equal(state.result && state.result.cleared, true);
  Sim.applyResult(save, state);
  Sim.applyResult(save, state);
  assert.equal(save.endless, true);
  assert.equal(save.unlocked, 12);
  assert.ok(save.cash > 200);
  const cash = save.cash;
  Sim.applyResult(save, state);
  assert.equal(save.cash, cash);
});

test('night jobs are reachable and separated', function () {
  for (let n = 1; n <= Sim.NIGHTS.length; n++) {
    const state = Sim.createNight(n, { engine: 0, handling: 0, nitro: 0, trunk: 0 });
    assert.equal(state.cargo.length + state.waiting.length, state.requiredTotal);
    assert.ok(state.requiredTotal >= 2);
    const jobs = state.cargo.concat(state.waiting);
    for (const job of jobs) {
      const hit = City.resolveCar(job.x, job.y, 12);
      assert.equal(hit.hit, null, state.nightName + ' ' + job.name);
    }
    if (state.sideOffer) {
      assert.ok(Math.hypot(state.sideOffer.dropX - state.sideOffer.x, state.sideOffer.dropY - state.sideOffer.y) > 500);
    }
  }
});

test('source copy does not use the word Vice or borrowed names', function () {
  const files = [
    'index.html', 'css/style.css', 'js/audio.js', 'js/city.js', 'js/sim.js', 'js/render.js', 'js/main.js'
  ];
  const banned = /\b(vice|gta|rockstar|cocaine|cartel|tommy vercetti)\b/i;
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal(banned.test(text), false, file);
  }
});

function pursuitPoint(path, x, y) {
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

function driveUntilDone(state, limitSec) {
  const dt = 1 / 60;
  let t = 0;
  let stuck = 0;
  let reverse = 0;
  let anchor = { x: state.x, y: state.y, at: 0 };
  while (state.phase !== 'summary' && t < limitSec) {
    let gas = 0;
    let brake = 0;
    let steer = 0;
    if (state.phase === 'play' && state.objective) {
      const path = City.route(state.x, state.y, state.objective.x, state.objective.y);
      const aim = pursuitPoint(path, state.x, state.y);
      const desired = Math.atan2(aim.y - state.y, aim.x - state.x);
      let diff = desired - state.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      steer = Math.abs(diff) < 0.12 ? 0 : (diff > 0 ? 1 : -1);
      const dist = Math.hypot(state.objective.x - state.x, state.objective.y - state.y);
      const want = Math.abs(diff) > 0.55 ? 72 : 168;
      if (Math.abs(state.speed) > want) { gas = 0; brake = 1; }
      else if (Math.abs(diff) > 0.85) { gas = 1; brake = 0; }
      else gas = 1;
      if (dist < 120) {
        gas = 0;
        brake = Math.abs(state.speed) > 28 ? 1 : 0;
      }
      if (Math.hypot(state.x - anchor.x, state.y - anchor.y) > 36) {
        anchor = { x: state.x, y: state.y, at: t };
        stuck = 0;
      } else if (t - anchor.at > 1.3) {
        reverse = 0.55;
        anchor.at = t;
      }
      if (reverse > 0) {
        gas = 0;
        brake = 1;
        steer = steer === 0 ? 1 : -steer;
        reverse -= dt;
      }
    }
    if (brake) gas = 0;
    Sim.step(state, { gas: gas, brake: brake, steer: steer, nitro: 0 }, dt);
    t += dt;
  }
  return t;
}

test('the car moves along its heading, not sideways', function () {
  const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4];
  for (const angle of angles) {
    const state = Sim.createNight(1, { engine: 0, handling: 0, nitro: 0, trunk: 0 });
    state.traffic = [];
    state.barricades = [];
    state.drones = [];
    state.x = 940;
    state.y = 1570;
    state.angle = angle;
    state.speed = 100;
    state.lat = 0;
    const x0 = state.x;
    const y0 = state.y;
    Sim.step(state, { gas: 1, brake: 0, steer: 0, nitro: 0, handbrake: 0 }, 1 / 30);
    const dx = state.x - x0;
    const dy = state.y - y0;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    const side = dx * (-Math.sin(angle)) + dy * Math.cos(angle);
    assert.ok(along > 1, 'along ' + angle);
    assert.ok(Math.abs(side) < along * 0.35, 'sideways ' + side + ' along ' + along);
  }
});

test('grip kills a slide unless the handbrake is held', function () {
  const plain = Sim.createNight(1, { engine: 0, handling: 0, nitro: 0, trunk: 0 });
  plain.traffic = [];
  plain.speed = 140;
  plain.lat = 80;
  plain.angle = 0;
  for (let i = 0; i < 20; i++) Sim.step(plain, { gas: 1, brake: 0, steer: 0, nitro: 0 }, 1 / 60);
  assert.ok(Math.abs(plain.lat) < 15, 'lat ' + plain.lat);
  const slide = Sim.createNight(1, { engine: 0, handling: 0, nitro: 0, trunk: 0 });
  slide.traffic = [];
  slide.x = 940;
  slide.y = 1570;
  slide.speed = 150;
  slide.lat = 0;
  slide.angle = 0;
  for (let i = 0; i < 25; i++) Sim.step(slide, { gas: 1, brake: 0, steer: 1, nitro: 0, handbrake: true }, 1 / 60);
  assert.ok(Math.abs(slide.lat) > 20 || slide.skids.length > 4, 'drift lat ' + slide.lat);
});

test('laser damages a drone and leaves traffic in the world', function () {
  const state = Sim.createNight(3, { engine: 0, handling: 0, nitro: 0, trunk: 0 });
  state.owned = ['laser'];
  state.weapon = 'laser';
  state.energy = 100;
  state.energyMax = 100;
  const drone = { id: 1, x: state.x + 80, y: state.y, hp: 64, max: 64, stun: 0, zap: 5, phase: 0 };
  state.drones = [drone];
  state.angle = 0;
  const cars = state.traffic.length;
  for (let i = 0; i < 40; i++) Sim.step(state, { gas: 0, brake: 1, steer: 0, fire: true }, 1 / 60);
  assert.ok(drone.hp < 64, 'hp ' + drone.hp);
  assert.equal(state.traffic.length, cars);
});

test('a digital driver clears the first three nights', function () {
  const upg = { engine: 0, handling: 0, nitro: 0, trunk: 0 };
  for (let n = 1; n <= 3; n++) {
    const state = Sim.createNight(n, upg);
    const t = driveUntilDone(state, 110);
    assert.equal(state.phase, 'summary', 'night ' + n + ' phase ' + state.phase + ' at ' + t.toFixed(1) + 's pos ' + Math.round(state.x) + ',' + Math.round(state.y));
    assert.equal(state.result.cleared, true, 'night ' + n);
    assert.ok(state.result.stars >= 1);
  }
});
